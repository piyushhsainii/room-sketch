-- MCP pilot credentials and transactional, idempotent writes.
-- Apply to the target environment before enabling MCP_ENABLED.
create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  token_hash text not null unique,
  scopes text[] not null check (scopes <@ array['projects:read','projects:write']::text[] and cardinality(scopes) > 0),
  project_ids uuid[],
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  rate_window timestamptz not null default now(),
  rate_count integer not null default 0
);
create index mcp_tokens_owner on public.mcp_tokens(user_id);
alter table public.mcp_tokens enable row level security;
-- No direct client policies. The cookie-authenticated management route checks ownership.
revoke all on public.mcp_tokens from anon, authenticated;
grant all on public.mcp_tokens to service_role;

create table public.mcp_operations (
  token_id uuid not null references public.mcp_tokens(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (token_id, request_id)
);
alter table public.mcp_operations enable row level security;
revoke all on public.mcp_operations from anon, authenticated;
grant all on public.mcp_operations to service_role;

create function public.mcp_authenticate(p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare t public.mcp_tokens;
begin
  select * into t from public.mcp_tokens where token_hash = p_hash for update;
  if not found or t.revoked_at is not null or t.expires_at <= now() then return null; end if;
  if t.rate_window <= now() - interval '1 minute' then t.rate_count := 0; t.rate_window := now(); end if;
  if t.rate_count >= 120 then return jsonb_build_object('rate_limited', true); end if;
  update public.mcp_tokens set rate_count = t.rate_count + 1, rate_window = t.rate_window, last_used_at = now() where id = t.id;
  return jsonb_build_object('id',t.id,'user_id',t.user_id,'scopes',t.scopes,'project_ids',t.project_ids);
end;
$$;
revoke all on function public.mcp_authenticate(text) from public, anon, authenticated;
grant execute on function public.mcp_authenticate(text) to service_role;

create function public.mcp_write_project(
  p_token_id uuid, p_request_id uuid, p_hash text, p_project_id uuid,
  p_create boolean, p_name text, p_base_revision text, p_document jsonb,
  p_scene jsonb, p_config jsonb, p_result jsonb, p_project_limit integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare t public.mcp_tokens; receipt public.mcp_operations; current_revision text; project_count integer;
begin
  -- Serialize writes for this credential, including retries, and check revocation again at commit.
  select * into t from public.mcp_tokens where id = p_token_id for update;
  if not found or t.revoked_at is not null or t.expires_at <= now() then raise exception 'unauthorized'; end if;
  if not ('projects:write' = any(t.scopes)) then raise exception 'insufficient_scope'; end if;
  if t.project_ids is not null and (p_create or not (p_project_id = any(t.project_ids))) then raise exception 'insufficient_scope'; end if;
  select * into receipt from public.mcp_operations where token_id = t.id and request_id = p_request_id;
  if found then
    if receipt.payload_hash <> p_hash then raise exception 'idempotency_conflict'; end if;
    return receipt.result;
  end if;
  if p_create then
    -- Serialize MCP creates across credentials belonging to this user.
    perform pg_advisory_xact_lock(hashtextextended(t.user_id::text, 0));
    select count(*) into project_count from public.projects where user_id = t.user_id;
    if project_count >= p_project_limit then raise exception 'project_limit'; end if;
    insert into public.projects(id,user_id,name,status,floorplan_url,workspace_enabled,floorplan_editor_state,scene_json,workspace_config)
      values(p_project_id,t.user_id,p_name,'uploaded','',true,p_document,p_scene,p_config);
  else
    select floorplan_editor_state->>'revision' into current_revision from public.projects
      where id = p_project_id and user_id = t.user_id for update;
    if not found then raise exception 'not_found'; end if;
    if current_revision is distinct from p_base_revision then raise exception 'revision_conflict'; end if;
    update public.projects set floorplan_editor_state = p_document, scene_json = p_scene,
      workspace_config = p_config, workspace_enabled = true, updated_at = now()
      where id = p_project_id and user_id = t.user_id;
  end if;
  insert into public.mcp_operations(token_id,request_id,payload_hash,result) values(t.id,p_request_id,p_hash,p_result);
  return p_result;
end;
$$;
revoke all on function public.mcp_write_project(uuid,uuid,text,uuid,boolean,text,text,jsonb,jsonb,jsonb,jsonb,integer) from public, anon, authenticated;
grant execute on function public.mcp_write_project(uuid,uuid,text,uuid,boolean,text,text,jsonb,jsonb,jsonb,jsonb,integer) to service_role;

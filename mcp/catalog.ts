// Data-only registry imports: never import the client furniture renderer here.
import { FURNITURE_CATALOG, FURNITURE_MODELS } from '@/components/workspace/mesh/furniture-model-registry';
import { FLOOR_MATERIALS, MATERIAL_REGISTRY } from '@/components/workspace/lib/constants';

export function furnitureCatalog() {
  return FURNITURE_CATALOG.filter(entry => {
    const model = FURNITURE_MODELS[entry.type];
    return model && model.available !== false;
  }).map(entry => {
    const model = FURNITURE_MODELS[entry.type]!;
    return { id: entry.type, label: entry.label, category: entry.category,
      width: model.defaultTargetWidth ?? model.nativeSize[0],
      depth: model.defaultTargetDepth ?? model.nativeSize[2], height: model.nativeSize[1] };
  });
}

export function materialCatalog(fullMaterials: boolean) {
  const basic = new Set(['plain', 'paint', 'wood', 'solid-white', 'solid-gray', 'solid-beige']);
  const floorIds = new Set(FLOOR_MATERIALS.map(material => material.id as string));
  return Object.entries(MATERIAL_REGISTRY)
    .filter(([id]) => fullMaterials || basic.has(id))
    .map(([id, def]) => ({ id, label: def.label ?? id, category: def.category,
      domains: def.domains.filter(domain => domain === 'wall' || (domain === 'floor' && floorIds.has(id))) }))
    .filter(entry => entry.domains.length > 0);
}

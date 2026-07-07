export default function Footer() {
  return (
    <footer className="bg-[#F2F0EA] border-t border-line px-6 md:px-10 py-7 flex flex-col md:flex-row items-center gap-4 justify-between text-[12.5px] font-light text-muted">
      <div className="flex items-center gap-2 font-display text-[16px] text-ink">
        <span className="w-[18px] h-[18px] rounded-[4px] bg-blue flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L6 3.5V10L1 8.2V1Z" stroke="white" strokeWidth="1" fill="none" />
            <path d="M6 3.5L11 1V8.2L6 10V3.5Z" stroke="white" strokeWidth="1" fill="none" />
          </svg>
        </span>
        RenderAI
      </div>
      <div className="flex gap-8">
        <a href="#" className="hover:text-ink transition-colors">Product</a>
        <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
        <a href="#" className="hover:text-ink transition-colors">Docs</a>
        <a href="#" className="hover:text-ink transition-colors">Privacy</a>
      </div>
      <span className="font-mono text-[10px] text-blue">Floor plan → live 3D</span>
    </footer>
  );
}

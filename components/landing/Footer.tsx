export default function Footer() {
  return (
    <footer className="bg-[#F2F0EA] border-t border-line px-6 md:px-10 py-7 flex flex-col md:flex-row items-center gap-4 justify-between text-[12.5px] font-light text-muted">
      <div className="flex items-center gap-2 font-display text-[16px] text-ink">
        <img
          src="/room-sketch-logo.jpg"
          alt="RoomSketch"
          className="w-[22px] h-[22px] rounded-[5px] object-cover"
        />
        RoomSketch
      </div>
      <div className="flex gap-8">
        <a href="#features" className="hover:text-ink transition-colors">Product</a>
        <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
        <a href="#" className="hover:text-ink transition-colors">Docs</a>
        <a href="#" className="hover:text-ink transition-colors">Privacy</a>
        <a href="#" className="hover:text-ink transition-colors">Terms</a>
        <a href="mailto:hello@roomsketch.com" className="hover:text-ink transition-colors">Contact</a>
      </div>
      <span className="font-mono text-[10px] text-blue">Floor plan → live 3D</span>
    </footer>
  );
}
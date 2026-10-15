const ITEMS = [
  'FUTEVÔLEI',
  'VÔLEI DE PRAIA',
  'BEACH TÊNIS',
  'AULAS PARA TODOS OS NÍVEIS',
  'BALNEÁRIO GAIVOTA/SC',
];

export default function TopBar() {
  const repeated = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];
  return (
    <div className="bg-lime text-ink py-1.5 overflow-hidden whitespace-nowrap relative z-50">
      <div className="inline-block animate-marquee">
        {repeated.map((item, i) => (
          <span key={i} className="font-body font-bold text-xs md:text-sm tracking-wide mx-4">
            ☀ {item}
          </span>
        ))}
      </div>
    </div>
  );
}
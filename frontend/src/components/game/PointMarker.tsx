interface Props {
  point: number;
  mobile?: boolean;
}

export default function PointMarker({ point, mobile = false }: Props) {
  const isOn = point > 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`rounded-full border-4 flex items-center justify-center font-bold transition-all ${
          mobile ? 'w-10 h-10 text-xs' : 'w-14 h-14 text-sm'
        } ${
          isOn
            ? 'border-white bg-white text-gray-900 shadow-lg'
            : 'border-gray-600 bg-gray-800 text-gray-500'
        }`}
      >
        {isOn ? 'ON' : 'OFF'}
      </div>
      <div style={{ width: mobile ? 40 : 56 }} className="text-center">
        {isOn && (
          <div className="fade-in-up">
            <div className={`font-bold text-yellow-400 ${mobile ? 'text-xl' : 'text-2xl'}`}>{point}</div>
            <div className="text-xs text-gray-400">POINT</div>
          </div>
        )}
      </div>
    </div>
  );
}

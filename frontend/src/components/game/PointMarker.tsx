interface Props {
  point: number;
}

export default function PointMarker({ point }: Props) {
  const isOn = point > 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-sm transition-all ${
          isOn
            ? 'border-white bg-white text-gray-900 shadow-lg'
            : 'border-gray-600 bg-gray-800 text-gray-500'
        }`}
      >
        {isOn ? 'ON' : 'OFF'}
      </div>
      {isOn && (
        <div className="text-center fade-in-up">
          <div className="text-2xl font-bold text-yellow-400">{point}</div>
          <div className="text-xs text-gray-400">POINT</div>
        </div>
      )}
    </div>
  );
}

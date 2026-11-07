interface BusinessHoursProps {
  hours: string; // JSON string
}

export default function BusinessHours({ hours }: BusinessHoursProps) {
  let hoursData = {};
  try {
    hoursData = JSON.parse(hours || '{}');
  } catch {
    return null;
  }

  const daysMap: { [key: string]: string } = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  if (Object.keys(hoursData).length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-50 dark:border-gray-800 h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🕒 Horarios de atención</h3>
      <div className="space-y-2">
        {Object.entries(hoursData).map(([day, time]) => (
          <div key={day} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-gray-600 dark:text-gray-400 capitalize">{daysMap[day] || day}</span>
            <span className={`font-medium ${time === 'closed' ? 'text-red-500' : 'text-gray-900 dark:text-gray-200'}`}>
              {time === 'closed' ? 'Cerrado' : String(time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

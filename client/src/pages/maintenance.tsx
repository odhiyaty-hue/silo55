import { useEffect, useState } from "react";
import { Wrench, Clock } from "lucide-react";

const MAINTENANCE_END = new Date("2026-04-21T23:59:59");

function getTimeLeft() {
  const now = new Date();
  const diff = MAINTENANCE_END.getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export function isUnderMaintenance(): boolean {
  return new Date() < MAINTENANCE_END;
}

export default function MaintenancePage() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-amber-200 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-5">
            <Wrench className="w-12 h-12 text-amber-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          الموقع تحت الصيانة
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          نعتذر عن هذا الانقطاع. نحن نعمل على تحسين الموقع وسيعود قريباً.
        </p>

        {timeLeft && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-3 text-sm">
              <Clock className="w-4 h-4" />
              <span>الوقت المتبقي حتى العودة</span>
            </div>
            <div className="flex justify-center gap-4">
              {[
                { label: "ساعة", value: timeLeft.hours },
                { label: "دقيقة", value: timeLeft.minutes },
                { label: "ثانية", value: timeLeft.seconds },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center">
                  <div className="bg-amber-500 text-white rounded-xl w-16 h-16 flex items-center justify-center text-2xl font-bold shadow">
                    {String(value).padStart(2, "0")}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500">
          شكراً لصبركم — سنعود قريباً! 🐑
        </p>
      </div>
    </div>
  );
}

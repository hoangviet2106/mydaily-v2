export default function StreakWidget({ streak }) {
  if (!streak) return null;

  return (
    <div className="streak-card">
      <div className="streak-main">
        🔥 <span className="streak-count">{streak.current_streak}</span> ngày liên tiếp
      </div>

      <div className="streak-sub">
        Kỷ lục: {streak.longest_streak} ngày
      </div>

      {!streak.today_done ? (
        <div className="streak-warning">
          ⚠️ Hoàn thành 1 task hôm nay để giữ streak
        </div>
      ) : (
        <div className="streak-ok">✅ Hôm nay đã giữ streak</div>
      )}
    </div>
  );
}

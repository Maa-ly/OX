export default function RecentActivity() {
  // Placeholder data
  const activities = [
    { type: 'rating', user: '0x123...', ip: 'Chainsaw Man', action: 'rated 9/10' },
    { type: 'meme', user: '0x456...', ip: 'One Piece', action: 'posted a meme' },
    { type: 'prediction', user: '0x789...', ip: 'Solo Leveling', action: 'predicted episode 12' },
  ]

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Recent Activity</h2>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="card">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#dc2626] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {activity.type.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white">
                    <span className="font-semibold">{activity.user}</span> {activity.action} on{' '}
                    <span className="text-[#dc2626]">{activity.ip}</span>
                  </p>
                  <p className="text-sm text-gray-400">2 minutes ago</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


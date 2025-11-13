export default function Trending() {
  // Placeholder data
  const trendingIPs = [
    { id: '1', name: 'Jujutsu Kaisen', price: 0.18, change: '+12.5%' },
    { id: '2', name: 'Demon Slayer', price: 0.22, change: '+8.3%' },
    { id: '3', name: 'Attack on Titan', price: 0.20, change: '+5.7%' },
  ]

  return (
    <section className="py-16 bg-[#0f0f0f]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Trending Now</h2>
        <div className="space-y-4">
          {trendingIPs.map((ip, index) => (
            <div key={ip.id} className="card flex items-center justify-between hover:border-[#dc2626] transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-gray-500 w-8">#{index + 1}</div>
                <div>
                  <h3 className="text-xl font-semibold">{ip.name}</h3>
                  <p className="text-sm text-gray-400">Price: {ip.price} SUI</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-500">{ip.change}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


export default function FeaturedIPs() {
  // Placeholder data - will be replaced with real data
  const featuredIPs = [
    { id: '1', name: 'Chainsaw Man', image: '/placeholder.jpg', price: 0.15, rating: 9.2 },
    { id: '2', name: 'One Piece', image: '/placeholder.jpg', price: 0.25, rating: 9.8 },
    { id: '3', name: 'Solo Leveling', image: '/placeholder.jpg', price: 0.12, rating: 8.9 },
  ]

  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Featured IPs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredIPs.map((ip) => (
            <div key={ip.id} className="card hover:border-[#dc2626] transition-colors cursor-pointer">
              <div className="aspect-video bg-[#1a1a1a] rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">Image</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{ip.name}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Price</p>
                  <p className="text-lg font-bold text-[#dc2626]">{ip.price} SUI</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-lg font-bold">{ip.rating}/10</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


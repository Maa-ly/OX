export default function Hero() {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-b from-black via-[#1a1a1a] to-black">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Otaku Data Exchange
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Rate, predict, and trade tokens for your favorite anime, manga, and manhwa.
          Every contribution matters.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-primary text-lg px-8 py-4">
            Explore IPs
          </button>
          <button className="btn-secondary text-lg px-8 py-4">
            Learn More
          </button>
        </div>
      </div>
    </section>
  )
}


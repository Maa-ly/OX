import Header from '@/components/Header'
import Hero from '@/components/Hero'
import FeaturedIPs from '@/components/FeaturedIPs'
import Trending from '@/components/Trending'
import RecentActivity from '@/components/RecentActivity'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />
      <Hero />
      <FeaturedIPs />
      <Trending />
      <RecentActivity />
    </main>
  )
}


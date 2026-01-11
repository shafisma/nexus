import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { ChatBubbleLeftRightIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default async function Home() {
  const { userId } = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-300/10 rounded-full mix-blend-overlay filter blur-3xl animate-blob animation-delay-2000"></div>

      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-10 transition-all hover:bg-white/15">
        <div className="p-8 md:p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-6">
             <ChatBubbleLeftRightIcon className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-100 mb-6 tracking-tight">
            Nexus Chat
          </h1>
          <p className="text-lg md:text-xl text-purple-100 mb-10 max-w-lg mx-auto font-light leading-relaxed">
            Experience real-time connection with a modern, elegant interface. Connect instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {userId ? (
              <Link 
                href="/chat" 
                className="group w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Launch Chat
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/sign-in" 
                  className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  Sign In
                </Link>
                <Link 
                   href="/sign-up"
                   className="w-full sm:w-auto bg-indigo-600/30 text-white hover:bg-indigo-600/40 font-bold py-4 px-8 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/10"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      <footer className="absolute bottom-4 text-white/40 text-sm font-medium">
        © 2026 Nexus Chat. All rights reserved.
      </footer>
    </main>
  )
}
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'

export default async function Home() {
  const { userId } = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center mb-6 text-gray-800">Welcome to Nexus Chat</h1>
          <p className="text-center text-gray-600 mb-8">Connect with friends in real-time</p>
          {userId ? (
            <Link 
              href="/chat" 
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-center"
            >
              Go to Chat
            </Link>
          ) : (
            <Link 
              href="/sign-in" 
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 text-center"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
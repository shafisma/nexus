import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 
                'bg-indigo-600 hover:bg-indigo-700 text-sm normal-case',
            },
          }}
        />
      </div>
    </div>
  );
}
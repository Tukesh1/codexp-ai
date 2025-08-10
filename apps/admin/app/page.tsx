import Image from "next/image";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] bg-[#0A0A0A] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div>

      </div>
      <div>
        <div className="flex flex-col items-center gap-4">
        
      <div className="">
                <div className="w-[120px] h-[60px] relative">
          <Image
          src="/logo.png"
          alt="Logo"
          fill
          className="bg-cover shrink-0"
        />
        </div>
        
      </div>
      <p className="text-center text-gray-500">
        Welcome to the admin dashboard.<br/> Here you can manage your application.
      </p>
      </div>
      <div className="flex items-center pt-6 justify-center gap-4">
        <a href="/settings" className="text-blue-500 hover:scale-95 transform transition-transform duration-200 hover:bg-white/5 border rounded-full border-gray-800 px-5 py-2">
          Settings
        </a>
        <a href="/logout" className="text-red-500 hover:scale-95 transform transition-transform duration-200 hover:bg-white/5 border rounded-full border-gray-800 px-5 py-2 hover:underline">
          Logout
        </a>
      </div>
      </div>
      <div className="text-gray-400 text-sm">
        © {new Date().getFullYear()} ImaginecoreX. All rights reserved.  
    </div>
    </div>
  );
}

const testimonials = [
  {
    id: 1,
    name: "Lucas Grey",
    handle: "@ImLucasGrey",
    avatar: "https://pbs.twimg.com/profile_images/1843079229073981440/pQqZJX5G_400x400.jpg",
    content: "This is so ingenious and good!",
    verified: true
  },
  {
    id: 2,
    name: "Patrick Tobler",
    handle: "@Padierfind",
    avatar: "https://pbs.twimg.com/profile_images/1870640743196352514/bkdF-Dck_400x400.jpg",
    content: "I love this",
    verified: true
  },
  {
    id: 3,
    name: "Ben Tossell",
    handle: "@bentossell",
    avatar: "https://pbs.twimg.com/profile_images/1878086921726943233/vOx1kjeP_400x400.jpg",
    content: "well, an actually enjoyable way to organise my whole in and out of my business, plus highlighted a bunch of things I need to cancel",
    verified: true
  },
  {
    id: 4,
    name: "Christian Alares",
    handle: "@c_alares",
    avatar: "https://pbs.twimg.com/profile_images/1194368464946974728/1D2biimN_400x400.jpg",
    content: "Omg, this is so cool!",
    verified: true
  },
  {
    id: 5,
    name: "Zeno Rocha",
    handle: "@zenorocha",
    avatar: "https://pbs.twimg.com/profile_images/1792735373887696896/Nys5Q2b3_400x400.jpg",
    content: "this is absolutely amazing",
    verified: true
  },
  {
    id: 6,
    name: "Bailey Simrell",
    handle: "@baileysimrell",
    avatar: "https://pbs.twimg.com/profile_images/1488962358609330178/tdTC7o6M_400x400.jpg",
    content: "Awesome man, looks amazing 🔥",
    verified: true
  },
  {
    id: 7,
    name: "Darshan Gajara",
    handle: "@WeirdoWizard",
    avatar: "https://pbs.twimg.com/profile_images/1117472858836434944/FbWce7CZ_400x400.jpg",
    content: "No sweat! Your smooth integration with banking data blew me away.",
    verified: false
  },
  {
    id: 8,
    name: "FlowBite",
    handle: "@flowbite",
    avatar: "https://pbs.twimg.com/profile_images/1839412200760610816/Lce29ADc_400x400.jpg",
    content: "We love @flowbite 🖤",
    verified: true,
    isCompany: true
  },
  {
    id: 9,
    name: "Guillermo Rauch",
    handle: "@rauchg",
    avatar: "https://pbs.twimg.com/profile_images/1783856060249595904/8TfcCN0r_400x400.jpg",
    content: "nice to see @flowbite generative ui features built on @vercel AI sdk. flowbite is becoming one of the best OSS @nextjs real-world apps",
    verified: true
  },
  {
    id: 10,
    name: "Steven Tey",
    handle: "@steventey",
    avatar: "https://pbs.twimg.com/profile_images/1923813473240203264/owJG92AC_400x400.jpg",
    content: "Just found my new favorite open-source project → flowbite.com. It's a modern layer on top of Quickbooks/Xero that lets you automate the tedious accounting aspects of your business and focus on what matters – your product. Built by the 🐐s",
    verified: true
  },
  {
    id: 11,
    name: "Peer Richelsen",
    handle: "@peer_rich",
    avatar: "https://pbs.twimg.com/profile_images/1816814706000080897/uSIidPHz_400x400.png",
    content: "the best thing i couldve done as a founder is build something that helps other founders. so proud 🖤 @flowbite",
    verified: true
  }
]

export function Testimonials() {
  return (
    <section className="py-16 bg-[#0D0C0D] overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="relative pb-8">
          <h3 className="text-4xl mb-6 font-medium text-[#F5F5F3]">What people say</h3>
          <div
            className="scroller relative z-10 overflow-hidden -ml-4 md:-ml-[1200px] w-screen md:w-[calc(100vw+1400px)]"
            style={{
              '--animation-direction': 'forwards',
              '--animation-duration': '80s'
            } as React.CSSProperties}
          >
            <ul className="flex min-w-full shrink-0 gap-6 py-2 w-max flex-nowrap items-start animate-scroll hover:[animation-play-state:paused]">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <li
                  key={`${testimonial.id}-${index}`}
                  className="w-[300px] max-w-full relative flex-shrink-0 border border-[#2C2C2C] bg-[#121212] px-6 py-5 md:w-[300px]"
                >
                  <blockquote>
                    <div
                      aria-hidden="true"
                      className="user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
                    ></div>
                    <div className="flex space-x-2 items-center mb-4">
                      <img
                        alt="Tweet"
                        loading="lazy"
                        width="48"
                        height="48"
                        decoding="async"
                        className="rounded-full overflow-hidden"
                        src={testimonial.avatar}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="truncate max-w-36 text-[#F5F5F3] font-medium">
                            {testimonial.name}
                          </span>
                          {testimonial.verified && (
                            <svg width="16" height="16" className="h-4 w-4" viewBox="0 0 512 512">
                              <path
                                fill="#1da1f2"
                                d="M512 268c0 17.9-4.3 34.5-12.9 49.7s-20.1 27.1-34.6 35.4c.4 2.7.6 6.9.6 12.6 0 27.1-9.1 50.1-27.1 69.1-18.1 19.1-39.9 28.6-65.4 28.6-11.4 0-22.3-2.1-32.6-6.3-8 16.4-19.5 29.6-34.6 39.7-15 10.2-31.5 15.2-49.4 15.2-18.3 0-34.9-4.9-49.7-14.9-14.9-9.9-26.3-23.2-34.3-40-10.3 4.2-21.1 6.3-32.6 6.3-25.5 0-47.4-9.5-65.7-28.6-18.3-19-27.4-42.1-27.4-69.1 0-3 .4-7.2 1.1-12.6-14.5-8.4-26-20.2-34.6-35.4C4.3 302.5 0 285.9 0 268c0-19 4.8-36.5 14.3-52.3s22.3-27.5 38.3-35.1c-4.2-11.4-6.3-22.9-6.3-34.3 0-27 9.1-50.1 27.4-69.1s40.2-28.6 65.7-28.6c11.4 0 22.3 2.1 32.6 6.3 8-16.4 19.5-29.6 34.6-39.7C221.6 5.1 238.1 0 256 0s34.4 5.1 49.4 15.1c15 10.1 26.6 23.3 34.6 39.7 10.3-4.2 21.1-6.3 32.6-6.3 25.5 0 47.3 9.5 65.4 28.6s27.1 42.1 27.1 69.1c0 12.6-1.9 24-5.7 34.3 16 7.6 28.8 19.3 38.3 35.1C507.2 231.5 512 249 512 268zm-266.9 77.1 105.7-158.3c2.7-4.2 3.5-8.8 2.6-13.7-1-4.9-3.5-8.8-7.7-11.4-4.2-2.7-8.8-3.6-13.7-2.9-5 .8-9 3.2-12 7.4l-93.1 140-42.9-42.8c-3.8-3.8-8.2-5.6-13.1-5.4-5 .2-9.3 2-13.1 5.4-3.4 3.4-5.1 7.7-5.1 12.9 0 5.1 1.7 9.4 5.1 12.9l58.9 58.9 2.9 2.3c3.4 2.3 6.9 3.4 10.3 3.4 6.7-.1 11.8-2.9 15.2-8.7z"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-[#878787] font-normal">
                          {testimonial.handle}
                        </span>
                      </div>
                    </div>
                    <span className="relative z-20 text-sm leading-[1.6] text-[#878787] font-normal">
                      {testimonial.content}
                    </span>
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
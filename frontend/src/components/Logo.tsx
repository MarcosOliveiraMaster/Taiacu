type Props = {
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ size = 'md' }: Props) {
  const imgSize = size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-20 h-20' : 'w-28 h-28'
  const textSize = size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-4xl' : 'text-5xl'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Imagem — coloque logo.png em /public/logo.png */}
      <div className={`${imgSize} rounded-3xl overflow-hidden flex items-center justify-center`}>
        <img
          src="/logo.png"
          alt="TAIAÇU"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback enquanto a imagem não existe
            const target = e.currentTarget
            target.style.display = 'none'
            target.parentElement!.innerHTML = '<span class="text-5xl">🎵</span>'
          }}
        />
      </div>
      <h1 className={`${textSize} font-black text-purple-400 tracking-widest`}>
        TAIAÇU
      </h1>
    </div>
  )
}
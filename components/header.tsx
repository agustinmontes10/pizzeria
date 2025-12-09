export function Header() {

  return (
    <>
      <header className="bg-secondary-medium text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <img src="/logoOrange.svg" alt="" width={150} />
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6">
                <a href="#productos" className="hover:text-primary-light transition-colors">
                  Productos
                </a>
                <a href="#contacto" className="hover:text-primary-light transition-colors">
                  Contacto
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

    </>
  )
}

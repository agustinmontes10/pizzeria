export function Footer() {
  return (
    <footer className="bg-secondary-medium text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <img src="/logoOrange.svg" alt="" width={125} />

          <div>
            <h4 className="font-semibold mb-3">Horario</h4>
            <p className="text-white/80">Jueves a Domingo: 20:00 - 23:30</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Contacto</h4>
            <p className="text-white/80">📞 2983 388452</p>
          </div>
        </div>

        {/* <div className="mt-8 pt-6 border-t border-white/20 text-center text-white/70">
          <p>&copy; {new Date().getFullYear()} Pizzería Bella Napoli. Todos los derechos reservados.</p>
        </div> */}
      </div>
    </footer>
  )
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Noticias Diarias | Córdoba y Argentina",description:"La actualidad de Córdoba y Argentina, deportes en vivo y el tiempo en un solo lugar",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg"}};
export const viewport: Viewport = {themeColor:"#0b1520",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-AR"><body>{children}</body></html>}

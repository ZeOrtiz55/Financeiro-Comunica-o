import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ 
  subsets: ["latin"], 
  weight: ["400", "700", "900"],
  variable: '--font-poppins',
});

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" className={poppins.variable}>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: 'var(--font-poppins), sans-serif',
        backgroundColor: '#F5F5DC' // Fundo bege padrão
      }}>
        {children}
      </body>
    </html>
  );
}
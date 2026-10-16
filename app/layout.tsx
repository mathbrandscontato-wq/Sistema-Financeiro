import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'Sistema Financeiro | Math Brands',description:'Caixa, despesas, recebimentos, reserva e investimentos da Math Brands.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}

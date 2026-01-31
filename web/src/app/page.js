import { redirect } from 'next/navigation'

export default function RootPage() {
    // Redirige automáticamente al login administrativo
    redirect('/admin/login')
}
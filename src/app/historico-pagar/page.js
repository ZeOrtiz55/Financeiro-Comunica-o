'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO NOVO MENU
import MenuLateral from '@/components/MenuLateral'
// ÍCONES MODERNOS
import { 
  Bell, Menu, ArrowLeft, FileText, CheckCircle, Download, 
  Search, LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, UserCheck, LogOut 
} from 'lucide-react'

// --- TELA DE CARREGAMENTO ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '24px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <b style={{ fontWeight: '900', fontSize: '28px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

export default function HistoricoPagar() {
  const [lista, setLista] = useState([])
  const [userProfile, setUserProfile] = useState(null) // NOVO ESTADO
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const router = useRouter()
  
  const path = typeof window !== 'undefined' ? window.location.pathname : '/historico-pagar';

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      // CARREGA O PERFIL PARA O MENU FUNCIONAR
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)

      const { data } = await supabase.from('finan_pagar')
        .select('*')
        .eq('status', 'concluido')
        .order('id', { ascending: false })
      
      setLista(data || [])
      setLoading(false)
    }
    fetchData()
  }, [router])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const listaFiltrada = lista.filter(item => 
    item.fornecedor?.toLowerCase().includes(pesquisa.toLowerCase())
  )

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundImage: `url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069&auto=format&fit=crop')`, backgroundSize: 'cover', backgroundAttachment: 'fixed', fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet" />
      
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(241, 245, 249, 0.6)', zIndex: 0 }}></div>

      {/* CHAMADA CORRIGIDA: PASSANDO O userProfile */}
      <MenuLateral 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        path={path} 
        router={router} 
        handleLogout={handleLogout} 
        userProfile={userProfile} 
      />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative', transition: '0.4s' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'60px' }}>
            <div>
                <h1 style={{ fontWeight: '400', color: '#0f172a', margin: 0, fontSize:'38px', letterSpacing:'-1.5px' }}>HISTÓRICO DE PAGAMENTOS</h1>
                <div style={{ width: '100px', height: '4px', background: '#ef4444', marginTop: '15px' }}></div>
            </div>

            <div style={{ position: 'relative' }}>
                <Search size={22} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Pesquisar fornecedor..." 
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  style={{ padding: '18px 20px 18px 50px', width: '400px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '16px', background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
            </div>
        </header>

        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(15px)', borderRadius: '25px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead style={{ background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding:'30px', fontSize:'14px', fontWeight:'400', color:'#94a3b8' }}>ID</th>
                <th style={{ fontSize:'14px', fontWeight:'400', color:'#94a3b8' }}>FORNECEDOR</th>
                <th style={{ fontSize:'14px', fontWeight:'400', color:'#94a3b8' }}>VALOR PAGO</th>
                <th style={{ fontSize:'14px', fontWeight:'400', color:'#94a3b8' }}>VENCIMENTO</th>
                <th style={{ fontSize:'14px', fontWeight:'400', color:'#94a3b8', textAlign:'center' }}>ARQUIVOS</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', transition: '0.2s' }}>
                  <td style={{ padding:'25px 30px', fontSize:'16px', color:'#64748b' }}>#{item.id}</td>
                  <td style={{ fontSize:'18px', color:'#0f172a', fontWeight:'400' }}>{item.fornecedor?.toUpperCase()}</td>
                  <td style={{ fontSize:'18px', color:'#0f172a', fontWeight:'400' }}>R$ {item.valor}</td>
                  <td style={{ fontSize:'18px', color:'#475569', fontWeight:'400' }}>{item.data_vencimento}</td>
                  <td style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
                      {item.anexo_nf && <a href={item.anexo_nf} target="_blank" style={{ padding:'10px', borderRadius:'10px', background:'#f1f5f9', color:'#475569', border:'1px solid #cbd5e1' }}><FileText size={20} /></a>}
                      {item.anexo_comprovante && <a href={item.anexo_comprovante} target="_blank" style={{ padding:'10px', borderRadius:'10px', background:'#f0fdf4', color:'#166534', border:'1px solid #bcf0da' }}><CheckCircle size={20} /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listaFiltrada.length === 0 && (
            <div style={{padding:'100px', textAlign:'center'}}>
                <p style={{ fontSize:'18px', color:'#94a3b8' }}>Nenhum registro encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
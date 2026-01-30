'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// ÍCONES MODERNOS
import { Bell, Menu, ArrowLeft, FileText, Download, CheckCircle } from 'lucide-react'

// --- TELA DE CARREGAMENTO CHIQUE ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '24px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <b style={{ fontWeight: '900', fontSize: '28px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

export default function HistoricoReceber() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data } = await supabase.from('finan_receber')
        .select('*')
        .eq('status', 'concluido')
        .order('id', { ascending: false })
      
      setLista(data || [])
      setTimeout(() => setLoading(false), 800) // Transição suave
    }
    fetchData()
  }, [router])

  if (loading) return <LoadingScreen />

  return (
    <div style={{ 
        display: 'flex', minHeight: '100vh', 
        // NOVA IMAGEM: ARQUITETURA MODERNA MINIMALISTA
        backgroundImage: `url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')`, 
        backgroundSize: 'cover', backgroundAttachment: 'fixed', fontFamily: 'Montserrat, sans-serif' 
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      
      {/* OVERLAY 50% PARA VISIBILIDADE DA IMAGEM */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(241, 245, 249, 0.5)', zIndex: 0 }}></div>

      {/* SIDEBAR RETRÁTIL GLASS */}
      <aside 
        onMouseEnter={()=>setIsSidebarOpen(true)} 
        onMouseLeave={()=>setIsSidebarOpen(false)} 
        style={{ 
            width: isSidebarOpen ? '280px' : '65px', 
            background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
            height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 15px', display: 'flex', flexDirection: 'column', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1100, overflow: 'hidden' 
        }}
      >
        <div style={{ opacity: isSidebarOpen ? 1 : 0, transition:'0.2s', whiteSpace:'nowrap' }}>
            <b style={{display:'block', marginBottom:'40px', textAlign:'center', color:'#0f172a', fontSize:'18px', fontWeight: '900', letterSpacing:'3px'}}>NOVA</b>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => router.push('/')} style={{ background:'none', color:'#475569', border:'none', padding:'12px', borderRadius:'10px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px' }}>TAREFAS</button>
                <button onClick={() => router.push('/kanban')} style={{ background:'none', color:'#475569', border:'none', padding:'15px', borderRadius:'12px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px' }}>BOLETOS</button>
                <div style={{padding: '20px 15px 10px', fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px'}}>HISTÓRICOS</div>
                <button onClick={() => router.push('/historico-pagar')} style={{ background:'none', color:'#475569', border:'none', padding:'12px', borderRadius:'10px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px' }}>CONTAS PAGAR</button>
                <button onClick={() => router.push('/historico-receber')} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'12px 15px', textAlign:'left', fontWeight:'900', cursor:'pointer', fontSize:'12px' }}>CONTAS RECEBER</button>
            </nav>
        </div>
        {!isSidebarOpen && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#cbd5e1' }}>
                <Menu size={24} strokeWidth={1.5} />
            </div>
        )}
      </aside>

      <main style={{ marginLeft: '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
            <div>
                <h1 style={{ fontWeight: '900', color: '#0f172a', margin: 0, fontSize:'32px', letterSpacing:'-1.5px' }}>HISTÓRICO DE RECEBIMENTOS</h1>
                <div style={{ width: '60px', height: '4px', background: '#3b82f6', marginTop: '12px' }}></div>
            </div>
            <button onClick={() => router.push('/')} style={{ padding: '12px 25px', borderRadius: '8px', border: '1px solid #0f172a', cursor: 'pointer', background: '#0f172a', color:'#fff', fontWeight:'900', fontSize:'10px', letterSpacing: '1px', display:'flex', alignItems:'center', gap:'10px' }}>
                <ArrowLeft size={14}/> VOLTAR AO PAINEL
            </button>
        </header>

        {/* TABELA EM GRADE EXECUTIVA (OFF-WHITE / GELO) */}
        <div style={{ background: 'rgba(252, 252, 252, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '15px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding:'25px', fontSize:'10px', fontWeight:'900', color:'#94a3b8', letterSpacing:'1px' }}>ID</th>
                <th style={{ fontSize:'10px', fontWeight:'900', color:'#94a3b8', letterSpacing:'1px' }}>CLIENTE</th>
                <th style={{ fontSize:'10px', fontWeight:'900', color:'#94a3b8', letterSpacing:'1px' }}>VALOR RECEBIDO</th>
                <th style={{ fontSize:'10px', fontWeight:'900', color:'#94a3b8', letterSpacing:'1px' }}>DATA VENC.</th>
                <th style={{ fontSize:'10px', fontWeight:'900', color:'#94a3b8', letterSpacing:'1px', textAlign:'center' }}>DOCUMENTOS</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item, index) => (
                <tr key={item.id} style={{ 
                    borderBottom: index === lista.length - 1 ? 'none' : '1px solid #e2e8f0', 
                    transition: '0.2s'
                }}>
                  <td style={{ padding:'20px 25px', fontSize:'12px', fontWeight:'900', color:'#64748b' }}>#{item.id}</td>
                  <td style={{ fontSize:'14px', fontWeight:'700', color:'#0f172a' }}>{item.cliente.toUpperCase()}</td>
                  <td style={{ fontSize:'14px', fontWeight:'900', color:'#0f172a' }}>R$ {item.valor}</td>
                  <td style={{ fontSize:'13px', fontWeight:'500', color:'#475569' }}>{item.data_vencimento}</td>
                  <td style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                      {(item.anexo_nf_servico || item.anexo_nf_peca) && (
                        <a href={item.anexo_nf_servico || item.anexo_nf_peca} target="_blank" title="Ver Nota" style={{ padding:'8px', borderRadius:'8px', background:'#f1f5f9', color:'#475569', border:'1px solid #cbd5e1' }}>
                            <FileText size={16} />
                        </a>
                      )}
                      {item.anexo_boleto && (
                        <a href={item.anexo_boleto} target="_blank" title="Ver Boleto" style={{ padding:'8px', borderRadius:'8px', background:'#f0fdf4', color:'#166534', border:'1px solid #bcf0da' }}>
                            <Download size={16} />
                        </a>
                      )}
                      <div title="Concluído" style={{ padding:'8px', color:'#22c55e' }}>
                        <CheckCircle size={18} strokeWidth={3} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lista.length === 0 && (
            <div style={{padding:'80px', textAlign:'center'}}>
                <p style={{ fontSize:'12px', fontWeight:'700', color:'#94a3b8', letterSpacing:'1px' }}>NENHUM REGISTRO ENCONTRADO NO HISTÓRICO DE RECEBIMENTOS.</p>
            </div>
          )}
        </div>
      </main>

      {/* ÍCONE DE NOTIFICAÇÃO FIXO */}
      <div style={{ position: 'fixed', top: '50px', right: '50px', zIndex: 1200 }}>
          <div style={{ cursor:'pointer', color:'#0f172a', background:'rgba(255,255,255,0.8)', padding:'10px', borderRadius:'12px', border:'1px solid #cbd5e1', backdropFilter:'blur(5px)' }}>
              <Bell size={22} strokeWidth={1.5} />
          </div>
      </div>
    </div>
  )
}
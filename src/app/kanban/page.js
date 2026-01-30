'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// ÍCONES MODERNOS
import { Bell, MessageSquare, X, Menu, ArrowLeft, ShieldCheck, LogOut, CreditCard, Calendar, FileText, Download, CheckCircle, Upload, Send, History } from 'lucide-react'

// --- TELA DE CARREGAMENTO PADRONIZADA ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;300;400;900&display=swap" rel="stylesheet" />
        <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '100', fontSize: '28px', letterSpacing: '8px', textTransform: 'uppercase', marginBottom: '10px' }}>
                COMUNICAÇÃO FINANCEIRO
            </h1>
            <b style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '900', fontSize: '32px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                NOVA TRATORES
            </b>
        </div>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null') return '';
  if (dataStr.includes(',')) return dataStr.split(',').map(d => formatarData(d.trim())).join(' | ');
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// --- 1. CHAT COM MOLDURA E ÁREA DE ENVIO DESTACADA ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    const channel = supabase.channel(`chat_kbn_${chamadoId}`).on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` 
    }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...prev, payload.new]) 
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const t = novaMsg; setNovaMsg('')
    setMensagens(p => [...p, { id: Date.now(), texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
    await supabase.from('mensagens_chat').insert([{ texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
  }

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100%', 
      fontFamily: 'Montserrat, sans-serif',
      border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' 
    }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display:'flex', alignItems:'center', gap:'10px' }}>
          <MessageSquare size={16} color="#64748b" />
          <h4 style={{ fontSize: '10px', color: '#64748b', margin: 0, fontWeight:'900', letterSpacing: '2px' }}>CONVERSA INTERNA</h4>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px', gap: '12px', background: '#fff' }}>
        {mensagens.map((m) => {
           const souEu = String(m.usuario_id) === String(userProfile?.id);
           return (
             <div key={m.id} style={{ 
                alignSelf: souEu ? 'flex-end' : 'flex-start',
                background: souEu ? '#000000' : '#f1f5f9', 
                color: souEu ? '#ffffff' : '#000',
                padding: '12px 18px', borderRadius: souEu ? '15px 15px 2px 15px' : '15px 15px 15px 2px',
                maxWidth: '85%', boxShadow: souEu ? '0 4px 12px rgba(0,0,0,0.15)' : 'none', border: souEu ? 'none' : '1px solid #e2e8f0'
             }}>
                <b style={{fontSize:'8px', color: souEu ? '#94a3b8' : '#64748b', marginBottom: '4px', display:'block'}}>{m.usuario_nome.toUpperCase()}</b>
                <span style={{fontSize: '14px', fontWeight: souEu ? '500' : '400'}}>{m.texto}</span>
             </div>
           )
        })}
      </div>

      {/* ÁREA DE ENVIO DESTACADA */}
      <form onSubmit={enviar} style={{ display: 'flex', gap: '10px', padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <input 
          value={novaMsg} 
          onChange={e => setNovaMsg(e.target.value)} 
          placeholder="Escreva sua mensagem aqui..." 
          style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }} 
        />
        <button style={{ 
          background: '#000', color: '#fff', border: 'none', borderRadius: '12px', 
          width: '50px', height: '50px', display:'flex', alignItems:'center', justifyContent:'center', 
          cursor: 'pointer', transition: '0.2s' 
        }}>
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

export default function KanbanPage() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [fileBoleto, setFileBoleto] = useState(null)
  const router = useRouter()

  const colunas = [
    { id: 'gerar_boleto', titulo: 'GERAR BOLETO' },
    { id: 'enviar_cliente', titulo: 'ENVIAR CLIENTE' },
    { id: 'aguardando_vencimento', titulo: 'EM ABERTO' },
    { id: 'vencido', titulo: 'VENCIDO' },
    { id: 'pago', titulo: 'PAGO' }
  ]

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
      setChamados(data || [])
      setTimeout(() => setLoading(false), 1000)
    }
    fetchData()
  }, [router])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleGerarBoletoFaturamento = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto primeiro.")
    try {
      const path = `boletos/${Date.now()}-${fileBoleto.name}`
      await supabase.storage.from('anexos').upload(path, fileBoleto)
      const { data } = supabase.storage.from('anexos').getPublicUrl(path)
      await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq('id', id)
      alert("Sucesso!"); window.location.reload()
    } catch (e) { alert(e.message) }
  }

  const handleFinalizarEnvioBoleto = async (id) => {
    await supabase.from('Chamado_NF').update({ status: 'aguardando_vencimento', tarefa: 'Aguardando Pagamento' }).eq('id', id)
    alert("Movido!"); window.location.reload()
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;300;400;700;900&display=swap" rel="stylesheet" />
      <div style={{ position: 'fixed', inset: 0, background: '#f1f5f9', zIndex: 0 }}></div>

      {/* MENU LATERAL COM HISTÓRICOS */}
      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '280px' : '65px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 15px', display: 'flex', flexDirection: 'column', transition: '0.4s ease', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.2s', whiteSpace: 'nowrap', flex: 1 }}>
            <b style={{display:'block', marginBottom:'35px', textAlign:'center', color: '#000', fontSize:'18px', fontWeight: '900', letterSpacing:'3px'}}>NOVA</b>
            <div style={{ padding: '0 5px 25px', borderBottom: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#000', color: '#fff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} /></div>
                <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', color: '#000', fontWeight: '800', display: 'block' }}>{userProfile?.nome}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{userProfile?.funcao}</span>
                </div>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => router.push('/')} style={{ background:'none', color: '#475569', border:'none', padding:'15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize: '12px' }}>TAREFAS</button>
                <button onClick={() => router.push('/kanban')} style={{ background:'#000', color: '#fff', border:'none', padding:'15px', borderRadius:'10px', textAlign:'left', fontWeight:'900', cursor:'pointer', fontSize: '12px' }}>BOLETOS</button>
                <div style={{padding: '20px 15px 10px', fontSize: '10px', fontWeight: '900', color: '#94a3b8', letterSpacing: '1px'}}>HISTÓRICOS</div>
                <button onClick={() => router.push('/historico-pagar')} style={{ background:'none', color:'#475569', border:'none', padding:'12px 15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px' }}><History size={14}/> PAGAR</button>
                <button onClick={() => router.push('/historico-receber')} style={{ background:'none', color:'#475569', border:'none', padding:'12px 15px', textAlign:'left', fontWeight:'700', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px' }}><History size={14}/> RECEBER</button>
                <button onClick={handleLogout} style={{ marginTop: '20px', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '900', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><LogOut size={16} /> SAIR</button>
            </nav>
        </div>
        {!isSidebarOpen && <div style={{ textAlign:'center', color:'#94a3b8' }}><Menu size={24} /></div>}
      </aside>

      <main style={{ marginLeft: '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
            <div>
                <h1 style={{ fontWeight: '300', color: '#0f172a', margin: 0, fontSize:'42px', letterSpacing:'-2px' }}>Controle de Boletos</h1>
                <div style={{ width: '80px', height: '4px', background: '#000', marginTop: '15px' }}></div>
            </div>
            <button onClick={() => router.push('/')} style={{ padding: '15px 30px', borderRadius: '10px', border: '1px solid #000', cursor: 'pointer', background: '#000', color:'#fff', fontWeight:'900', fontSize:'11px' }}>VOLTAR AO PAINEL</button>
        </div>
        
        <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', alignItems: 'flex-start', paddingBottom:'30px' }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: '340px', flex: 1 }}>
              <h3 style={{ background: '#000', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '25px', fontWeight: '300', fontSize: '16px', textAlign: 'center', letterSpacing: '4px' }}>{col.titulo}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chamados.filter(c => c.status === col.id).map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada(t)} style={{ background: '#fff', borderRadius: '15px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: '0.2s ease', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#1e293b', padding: '22px', color: '#fff' }}>
                        <h4 style={{ margin: 0, fontSize: '24px', fontWeight: '400', color: '#fff', letterSpacing: '-0.5px' }}>{t.nom_cliente.toUpperCase()}</h4>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div><span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>VALOR TOTAL</span><b style={{ fontSize: '28px', color: '#38bdf8' }}>R$ {t.valor_servico}</b></div>
                            <div style={{ textAlign: 'right' }}><CreditCard size={16} style={{ opacity: 0.7, marginBottom: '4px' }} /><b style={{ fontSize: '13px', display: 'block', fontWeight: '900' }}>{t.forma_pagamento.toUpperCase()}</b></div>
                        </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap:'15px', fontSize:'10px' }}>
                            <div style={{ borderRight: '1px solid #f1f5f9' }}><label style={{display:'block', fontWeight:'900', color:'#94a3b8', marginBottom: '3px'}}>ID PROCESSO</label><b style={{ color: '#0f172a', fontSize: '12px' }}>#{t.id}</b></div>
                            <div><label style={{display:'block', fontWeight:'900', color:'#94a3b8', marginBottom: '3px'}}>NF PEÇA</label><b style={{ color: '#0f172a', fontSize: '12px' }}>{t.num_nf_peca || '-'}</b></div>
                        </div>
                        <div style={{ marginTop:'15px', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <Calendar size={14} color="#ef4444" />
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#ef4444' }}>VENCIMENTOS:</span>
                            <b style={{ fontSize: '11px', color: '#0f172a' }}>{formatarData(t.datas_parcelas) || formatarData(t.vencimento_boleto) || 'Imediato'}</b>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL RESPONSIVO */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ 
            background: '#fff', width: '100%', maxWidth: '1250px', maxHeight: '90vh', borderRadius: '25px', 
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', border: '1px solid #cbd5e1' 
          }}>
            <div style={{ flex: '1 1 600px', padding: '40px 60px', overflowY: 'auto', maxHeight: '90vh' }}>
              <button onClick={() => setTarefaSelecionada(null)} style={{ background: '#000', border: 'none', color: '#fff', padding: '12px 25px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize:'11px', marginBottom: '40px', display:'flex', alignItems:'center', gap:'10px' }}><ArrowLeft size={16}/> VOLTAR</button>
              
              <div style={{ marginBottom: '40px' }}>
                 <b style={{ fontSize: '18px', color: '#3b82f6', fontWeight: '800' }}>#{tarefaSelecionada.id}</b>
                 <h2 style={{ color: '#0f172a', margin: '5px 0 0 0', fontSize:'42px', fontWeight:'100' }}>{tarefaSelecionada.nom_cliente.toUpperCase()}</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', border: '1px solid #e2e8f0', background: '#fcfcfc', borderRadius:'15px', overflow:'hidden', marginBottom: '30px' }}>
                 <div style={{ padding: '25px', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>VALOR TOTAL</label><b style={{fontSize:'28px', fontWeight:'900', color:'#0f172a'}}>R$ {tarefaSelecionada.valor_servico}</b></div>
                 <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>PAGAMENTO</label><b style={{fontSize: '18px', fontWeight: '700', color: '#334155'}}>{tarefaSelecionada.forma_pagamento?.toUpperCase()}</b></div>
                 <div style={{ padding: '25px', borderRight: '1px solid #e2e8f0' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>VENCIMENTOS</label><b style={{fontSize: '14px', fontWeight: '700', color: '#334155'}}>{formatarData(tarefaSelecionada.datas_parcelas) || formatarData(tarefaSelecionada.vencimento_boleto) || 'IMEDIATO'}</b></div>
                 <div style={{ padding: '25px' }}><label style={{fontSize:'10px', color: '#94a3b8', fontWeight:'900', display:'block', marginBottom:'10px'}}>NOTAS FISCAIS</label><b style={{fontSize: '14px', fontWeight: '700', color: '#334155'}}>{tarefaSelecionada.num_nf_servico && `S: ${tarefaSelecionada.num_nf_servico}`} {tarefaSelecionada.num_nf_peca && `| P: ${tarefaSelecionada.num_nf_peca}`}</b></div>
              </div>

              {userProfile?.funcao === 'Financeiro' && tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ background: '#eff6ff', padding: '30px', borderRadius: '15px', border: '1px solid #3b82f6', marginBottom: '35px' }}>
                    <h3 style={{ fontSize: '15px', margin: '0 0 20px 0', color: '#1e3a8a', fontWeight: '900' }}>GERAR BOLETO:</h3>
                    <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', background:'#fff', padding:'25px', borderRadius:'12px', border:'2px dashed #3b82f6', cursor:'pointer', marginBottom:'20px' }}>
                        <Upload size={28} color="#3b82f6" />
                        <div style={{textAlign:'left'}}><span style={{fontSize:'16px', fontWeight:'800', color:'#1d4ed8', display:'block'}}>{fileBoleto ? fileBoleto.name : 'ANEXAR BOLETO'}</span><span style={{fontSize:'11px', color:'#60a5fa'}}>PDF, JPG, PNG</span></div>
                        <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                    </label>
                    <button onClick={() => handleGerarBoletoFaturamento(tarefaSelecionada.id)} style={{ width: '100%', background: '#1e3a8a', color: '#fff', padding: '20px', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}><Send size={18}/> ENVIAR PARA PÓS-VENDAS</button>
                </div>
              )}

              {userProfile?.funcao === 'Pós-Vendas' && tarefaSelecionada.status === 'enviar_cliente' && (
                <div style={{ background: '#f0fdf4', padding: '30px', borderRadius: '15px', border: '1px solid #22c55e', marginBottom: '35px', textAlign:'center' }}>
                    <button onClick={() => handleFinalizarEnvioBoleto(tarefaSelecionada.id)} style={{ width: '100%', background: '#22c55e', color: '#fff', padding: '20px', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '15px' }}>✅ BOLETO ENVIADO: MOVER PARA EM ABERTO</button>
                </div>
              )}

              <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank" className="btn-anexo"><FileText size={18}/> NF SERVIÇO</a>}
                {tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank" className="btn-anexo"><FileText size={18}/> NF PEÇA</a>}
                {tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank" className="btn-anexo" style={{background:'#1e3a8a', color:'#fff', border:'none'}}><Download size={18}/> BOLETO 1</a>}
                {tarefaSelecionada.comprovante_pagamento && <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" className="btn-anexo" style={{color:'#16a34a', borderColor:'#22c55e'}}><CheckCircle size={18}/> COMPROVANTE</a>}
              </div>
            </div>

            {/* CHAT COM MOLDURA NO MODAL */}
            <div style={{ flex: '1 1 400px', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', maxHeight: '90vh' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .btn-anexo { flex:1; textAlign:center; border:1px solid #cbd5e1; padding:15px; borderRadius:12px; textDecoration:none; color:#0f172a; fontSize:11px; fontWeight:900; display:flex; alignItems:center; justifyContent:center; gap:8px; background:#fff; transition:0.2s; }
        .btn-anexo:hover { background: #f1f5f9; transform: translateY(-2px); }
      `}</style>
    </div>
  )
}
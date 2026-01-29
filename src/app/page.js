'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// --- COMPONENTE DE CHAT POR CARD (ABRE AO CLICAR NO CARD) ---
function ChatChamado({ chamadoId, nomCliente, userProfile, onClose }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId) return
    
    // 1. Carregar histórico do chamado específico
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => data && setMensagens(data))

    // 2. Escuta apenas mensagens deste chamado_id
    const channel = supabase.channel(`chat_card_${chamadoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensagens_chat',
        filter: `chamado_id=eq.${chamadoId}` 
      }, payload => {
        if (String(payload.new.usuario_id) !== String(userProfile.id)) {
          setMensagens(prev => [...prev, payload.new])
        }
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault()
    if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')

    // Update Otimista
    const tempMsg = { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }
    setMensagens(prev => [...prev, tempMsg])

    await supabase.from('mensagens_chat').insert([{ 
      texto, 
      usuario_nome: userProfile.nome, 
      usuario_id: userProfile.id, 
      chamado_id: chamadoId 
    }])
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '380px', height: '600px', borderRadius: '35px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '25px', background: '#22c55e', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <b style={{display:'block', fontSize:'16px'}}>{nomCliente}</b>
            <span style={{fontSize:'10px', opacity: 0.8}}>ID do Chamado: #{chamadoId}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', borderRadius:'50%', width:'35px', height:'35px', cursor: 'pointer', fontWeight:'bold' }}>✕</button>
        </div>
        
        <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background:'#f0f2f5' }}>
          {mensagens.map(m => {
            const souEu = String(m.usuario_id) === String(userProfile.id)
            return (
              <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', background: souEu ? '#22c55e' : 'white', color: souEu ? 'white' : '#333', padding: '12px 16px', borderRadius: souEu ? '20px 20px 5px 20px' : '20px 20px 20px 5px', fontSize: '13px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '80%' }}>
                <b style={{ fontSize: '9px', display: 'block', marginBottom:'3px', opacity: souEu ? 0.9 : 0.6 }}>{m.usuario_nome}</b>
                {m.texto}
              </div>
            )
          })}
        </div>

        <form onSubmit={enviar} style={{ padding: '20px', display: 'flex', gap: '10px', background: 'white', borderTop: '1px solid #eee' }}>
          <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva uma mensagem..." style={{ flex: 1, padding: '12px 18px', borderRadius: '25px', border: '1px solid #ddd', outline:'none', fontSize:'14px' }} />
          <button style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '50%', width:'45px', height:'45px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>➔</button>
        </form>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL (HOME) ---
export default function Home() {
  const [tarefas, setTarefas] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [chatAberto, setChatAberto] = useState(null)
  const [notificacaoGlobal, setNotificacaoGlobal] = useState(0)
  const [isSelecaoOpen, setIsSelecaoOpen] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      
      // SINO: Escuta mensagens de QUALQUER chamado para o alerta global
      supabase.channel('global_notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, payload => {
        if (String(payload.new.usuario_id) !== String(session.user.id)) {
          setNotificacaoGlobal(prev => prev + 1)
          const audio = new Audio('/notificacao.mp3')
          audio.play().catch(()=>{})
        }
      }).subscribe()

      carregarTarefas(prof)
    }
    carregar()
  }, [])

  const carregarTarefas = async (prof) => {
    const { data: chamados } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const filtradas = (chamados || []).filter(t => {
      if (prof?.funcao === 'Financeiro') return t.status === 'gerar_boleto' || t.status === 'validar_pix'
      if (prof?.funcao === 'Pós-Vendas') return t.status === 'enviar_cliente' || t.status === 'vencido'
      return false
    })
    setTarefas(filtradas)
    setLoading(false)
  }

  const glassStyle = { background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '35px' }

  return (
    <div style={{ padding: '30px 20px', maxWidth: '850px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER COM SINO */}
      <header style={{ ...glassStyle, padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '45px', height: '45px', background: '#22c55e', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{userProfile?.nome?.charAt(0)}</div>
          <div>
            <h1 style={{ fontSize: '14px', margin: 0 }}>{userProfile?.nome}</h1>
            <p style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>{userProfile?.funcao?.toUpperCase()}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* SINO GLOBAL */}
          <div onClick={() => { setNotificacaoGlobal(0); router.push('/kanban') }} style={{ position: 'relative', fontSize: '24px', cursor: 'pointer' }}>
            🔔
            {notificacaoGlobal > 0 && (
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', fontSize: '10px', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', fontWeight: 'bold' }}>{notificacaoGlobal}</div>
            )}
          </div>

          <button onClick={() => router.push('/kanban')} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '12px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', cursor:'pointer' }}>📊 FLUXO NF</button>
          <button onClick={() => setIsSelecaoOpen(true)} style={{ background: '#22c55e', color: 'white', padding: '12px 25px', borderRadius: '12px', border: 'none', fontWeight:'bold', cursor:'pointer' }}>+ NOVO</button>
        </div>
      </header>

      {/* LISTAGEM DE CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#14532d' }}>Fila de Trabalho</h2>
        {tarefas.map(t => (
          <div key={t.id} 
               onClick={() => setChatAberto({id: t.id, nome: t.nom_cliente})} // ABRE O CHAT AO CLICAR NO CARD
               style={{ ...glassStyle, padding: '25px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '9px', fontWeight: '900', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{t.tarefa.toUpperCase()}</span>
              <h3 style={{ margin: '10px 0 0 0', fontWeight: '800' }}>{t.nom_cliente}</h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }} onClick={(e) => e.stopPropagation()}>
              <p style={{ fontWeight: '900', fontSize: '20px', color: '#166534', margin: 0 }}>R$ {t.valor_servico}</p>
              
              {/* BOTÃO DE AVANÇAR PROCESSO (Abre o modal de regras que você já tinha) */}
              <button 
                onClick={() => setTarefaSelecionada(t)} 
                style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                AVANÇAR ⮕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAIS */}
      {chatAberto && <ChatChamado chamadoId={chatAberto.id} nomCliente={chatAberto.nome} userProfile={userProfile} onClose={() => setChatAberto(null)} />}

      {/* Aqui você mantém os seus outros modais (Seleção Novo, Formulário NF, e o Modal de Avançar com as travas de download/anexo) */}
    </div>
  )
}
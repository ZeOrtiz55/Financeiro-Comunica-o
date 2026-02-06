'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
  CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Search, Trash2, Settings, RefreshCw, AlertCircle
} from 'lucide-react'

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070" style={{ position: 'absolute', top: '25%', left: '10%', width: '600px', opacity: 0.08, filter: 'blur(2px)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>
            Fluxo Pós-Vendas <br /> <span style={{ fontSize: '32px' }}>Nova Tratores</span>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || typeof dataStr !== 'string') return '';
  const partes = dataStr.split('-');
  if (partes.length !== 3) return dataStr; 
  const anoCurto = partes[0].slice(-2); 
  return `${partes[2]}/${partes[1]}/${anoCurto}`;
};

// --- 1. CHAT INTERNO ---
function ChatChamado({ registroId, tipo, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()
  const colunaId = tipo === 'boleto' ? 'chamado_id' : tipo === 'pagar' ? 'pagar_id' : tipo === 'receber' ? 'receber_id' : 'rh_id';

  useEffect(() => {
    if (!registroId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq(colunaId, registroId).order('created_at', { ascending: true })
      .then(({ data }) => setMensagens(data || []))
    const channel = supabase.channel(`chat_pos_${registroId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `${colunaId}=eq.${registroId}` }, payload => { 
      if (payload.new.usuario_id !== userProfile.id) {
        setMensagens(prev => [...prev, payload.new]) 
      }
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [registroId, userProfile?.id, tipo, colunaId])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
    const insertData = { texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id };
    insertData[colunaId] = registroId;
    await supabase.from('mensagens_chat').insert([insertData])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', color: '#64748b', letterSpacing: '1px' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <span style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</span>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Escreva..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px', cursor: 'pointer' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 3. KANBAN PÓS-VENDAS ---
export default function KanbanPosVendas() {
  const [chamados, setChamados] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const [showNovoMenu, setShowNovoMenu] = useState(false)
  const router = useRouter()

  const colunas = [
    { id: 'enviar_cliente', titulo: 'ENVIAR PARA CLIENTE' },
    { id: 'aguardando_vencimento', titulo: 'AGUARDANDO VENCIMENTO' },
    { id: 'pago', titulo: 'PAGO' },
    { id: 'vencido', titulo: 'VENCIDO' }
  ]

  const carregarDados = async () => {
    const { data } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const hoje = new Date();
    let cardsProcessados = [];

    (data || []).forEach(c => {
      // Pós-Vendas NÃO vê validar_pix
      if (c.status === 'validar_pix') return;

      if (c.qtd_parcelas > 1 && c.datas_parcelas) {
        const datas = c.datas_parcelas.split(/[\s,]+/).filter(d => d.includes('-'));
        datas.forEach((dataParc, index) => {
          const numParc = index + 1;
          const vencParc = new Date(dataParc);
          let statusIndividual = c[`status_p${numParc}`] || 'aguardando_vencimento';
          let tarefaIndividual = c[`tarefa_p${numParc}`] || `Parcela ${numParc}/${c.qtd_parcelas}`;
          let recobrancasIndividual = c[`recombrancas_qtd_p${numParc}`] || 0;

          if (vencParc < hoje && statusIndividual === 'aguardando_vencimento') {
            statusIndividual = 'pago';
            tarefaIndividual = `Boleto Vencido: Verificar Pagamento (Parcela ${numParc})`;
          }

          const valorDaParcela = c[`valor_parcela${numParc}`] || (c.valor_servico / c.qtd_parcelas).toFixed(2);
          cardsProcessados.push({
            ...c, id_virtual: `${c.id}_p${numParc}`, nom_cliente: `${c.nom_cliente} (PARC ${numParc})`,
            vencimento_boleto: dataParc, valor_exibicao: valorDaParcela, status: statusIndividual, 
            tarefa: tarefaIndividual, recombrancas_qtd_individual: recobrancasIndividual, numParcelaReferencia: numParc, isChild: true
          });
        });
      } else {
        const itemNormal = { ...c, valor_exibicao: c.valor_servico, recombrancas_qtd_individual: c.recombrancas_qtd || 0 };
        cardsProcessados.push(itemNormal);
      }
    });
    setChamados(cardsProcessados)
  }

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      setLoading(false)
    }
    carregar()
  }, [router])

  useEffect(() => {
    if (userProfile) {
        carregarDados();
        const channel = supabase.channel('notif_kanban_pos').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Chamado_NF' }, payload => { carregarDados() }).subscribe();
        return () => { supabase.removeChannel(channel) };
    }
  }, [userProfile]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); }

  const handleUpdateField = async (id, field, value) => {
    const finalValue = (value === "" && (field.includes('data') || field.includes('vencimento'))) ? null : value;
    if (typeof id === 'string' && id.includes('_p')) {
      const [idReal, pNum] = id.split('_p');
      const fieldNameIndividual = `${field}_p${pNum}`;
      await supabase.from('Chamado_NF').update({ [fieldNameIndividual]: finalValue }).eq('id', idReal);
      setTarefaSelecionada(prev => ({...prev, [field]: finalValue}));
    } else {
      await supabase.from('Chamado_NF').update({ [field]: finalValue }).eq('id', id);
      setTarefaSelecionada(prev => ({...prev, [field]: finalValue}));
    }
  };

  const handleIncrementRecobranca = async (id, currentVal) => {
    const isChild = typeof id === 'string' && id.includes('_p');
    const idReal = isChild ? id.split('_p')[0] : id;
    const pNum = isChild ? id.split('_p')[1] : null;
    const newVal = (currentVal || 0) + 1;
    const updateData = isChild ? { [`recombrancas_qtd_p${pNum}`]: newVal } : { recombrancas_qtd: newVal };
    await supabase.from('Chamado_NF').update(updateData).eq('id', idReal);
    setTarefaSelecionada(prev => ({...prev, recombrancas_qtd_individual: newVal}));
  };

  const chamadosFiltrados = chamados.filter(c => 
    c.nom_cliente?.toLowerCase().includes(pesquisa.toLowerCase()) || c.id.toString().includes(pesquisa)
  )

  const path = typeof window !== 'undefined' ? window.location.pathname : '/kanban-posvendas';

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <GeometricBackground />

      {/* CORREÇÃO: Passando o userProfile para evitar 404 no menu */}
      <MenuLateral 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        path={path} 
        router={router} 
        handleLogout={handleLogout} 
        userProfile={userProfile}
      />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'50px' }}>
            <div>
              <h1 style={{ color: '#0f172a', margin: 0, fontSize:'42px', letterSpacing:'-1.5px', fontWeight:'900' }}>Fluxo Pós-Vendas</h1>
              <div style={{ width: '80px', height: '4px', background: '#000', marginTop: '15px' }}></div>
            </div>
            <div style={{display:'flex', gap:'35px', alignItems:'center'}}>
                <input type="text" placeholder="Pesquisar..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} style={{ padding: '18px 20px 18px 50px', width: '400px', borderRadius: '15px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }} />
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'20px 40px', borderRadius:'15px', fontWeight:'900', cursor:'pointer', fontSize:'16px' }}>
                    NOVO CHAMADO
                  </button>
                  {showNovoMenu && (
                    <div onMouseLeave={() => setShowNovoMenu(false)} style={{ position:'absolute', top:'85px', right: 0, background:'#fff', borderRadius:'20px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', zIndex:2000, width:'320px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                      <div onClick={() => router.push('/novo-chamado-nf')} style={{ padding:'25px', cursor:'pointer', color: '#000', borderBottom:'1px solid #f1f5f9' }}>CHAMADO DE BOLETO</div>
                      <div onClick={() => router.push('/novo-pagar-receber')} style={{ padding:'25px', cursor:'pointer', color: '#000', borderBottom:'1px solid #f1f5f9' }}>CONTAS PAGAR / RECEBER</div>
                      <div onClick={() => router.push('/novo-chamado-rh')} style={{ padding:'25px', cursor:'pointer', color: '#2563eb' }}>CHAMADO RH</div>
                    </div>
                  )}
                </div>
            </div>
        </header>

        <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom:'30px' }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: '380px', flex: 1 }}>
              <h3 style={{ background: '#000', color: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '25px', fontSize: '18px', textAlign: 'center' }}>{col.titulo}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chamadosFiltrados.filter(c => c.status === col.id).map(t => (
                  <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} className="task-card">
                    <div className="card-header-internal" style={{ background: t.status === 'vencido' || (t.status === 'aguardando_vencimento' && t.tarefa.includes('Cobrado')) ? '#ef4444' : '#1e293b', padding: '25px', color: '#fff' }}>
                      <span style={{ fontSize: t.isChild ? '20px' : '28px', fontWeight:'400' }}>{t.nom_cliente?.toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '25px' }}>
                      <span className="payment-badge">{t.forma_pagamento?.toUpperCase()}</span>
                      <div style={{marginTop:'15px', fontSize:'22px', fontWeight:'500'}}>R$ {t.valor_exibicao}</div>
                      <div style={{marginTop:'10px', fontSize:'12px', opacity:0.7}}>{t.tarefa}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '35px', display: 'flex', flexDirection: 'row', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <div style={{ flex: '1.2', padding: '60px', overflowY: 'auto', maxHeight: '95vh' }}>
              <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={16}/> VOLTAR</button>
              <h2 style={{ fontSize: '56px', color: '#0f172a', margin: '5px 0', fontWeight:'400' }}>{tarefaSelecionada.nom_cliente?.toUpperCase()}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e2e8f0', borderRadius: '15px', overflow: 'hidden', marginTop:'30px' }}>
                 <div className="info-block-grid"><label>VALOR TOTAL</label><span>R$ {tarefaSelecionada.valor_exibicao}</span></div>
                 <div className="info-block-grid"><label>VENCIMENTO</label><span>{formatarData(tarefaSelecionada.vencimento_boleto)}</span></div>
              </div>

              <div style={{marginTop:'40px', display:'flex', gap:'20px', flexWrap:'wrap'}}>
                {/* AÇÕES EXCLUSIVAS PÓS-VENDAS */}
                {tarefaSelecionada.tarefa.includes('COBRAR') && (
                   <button onClick={() => {
                     handleIncrementRecobranca(tarefaSelecionada.id_virtual || tarefaSelecionada.id, tarefaSelecionada.recombrancas_qtd_individual);
                     handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Aguardando Verificação Financeiro (Cobrado)');
                     alert("Cobrança registrada!"); window.location.reload();
                   }} style={{width:'100%', background:'#22c55e', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>Cliente Cobrado (Registrar Recobrança)</button>
                )}
                {tarefaSelecionada.status === 'enviar_cliente' && (
                   <button onClick={() => { handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'status', 'aguardando_vencimento'); handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'tarefa', 'Aguardando Vencimento'); alert("Boleto enviado!"); window.location.reload(); }} style={{width:'100%', background:'#22c55e', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>Confirmar Envio ao Cliente</button>
                )}
              </div>
            </div>
            <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              {userProfile && <ChatChamado registroId={tarefaSelecionada?.id} tipo="boleto" userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        * { font-weight: 500 !important; }
        .task-card { background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 20px; cursor: pointer; overflow: hidden; width: 100%; transition: 0.2s; }
        .task-card:hover { transform: translateY(-5px); }
        .card-header-internal { padding: 25px; color: #fff; }
        .payment-badge { background: #000; color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 12px; display: inline-block; }
        .info-block-grid { padding: 15px; border: 0.5px solid #e2e8f0; background: #fff; }
        .info-block-grid label { display: block; fontSize: 11px; color: #000; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
        .info-block-grid span { fontSize: 15px; color: #0f172a; }
        .btn-back { background: #0f172a; border: none; color: #fff; padding: 12px 24px; borderRadius: 12px; cursor: pointer; fontSize:12px; marginBottom: 30px; font-weight: 900 !important; }
      `}</style>
    </div>
  )
}
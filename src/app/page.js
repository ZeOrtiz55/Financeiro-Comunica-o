'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DE ÍCONES COMPLETA
import { 
  Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
  CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
  Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
  CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Settings, Trash2, Edit3, RefreshCw, AlertCircle
} from 'lucide-react'

// --- COMPONENTE DE NOTIFICAÇÃO INVASIVA (TOAST) ---
function NotificationToast({ notif, onClose }) {
  const color = notif.tipo === 'movimento' ? '#2563eb' : (notif.isGeral ? '#0f172a' : '#8b5cf6');
  
  return (
    <div style={{
      background: '#fff',
      borderLeft: `8px solid ${color}`,
      padding: '20px',
      borderRadius: '15px',
      boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '350px',
      maxWidth: '450px',
      animation: 'slideIn 0.5s ease-out forwards',
      position: 'relative',
      zIndex: 9999,
      fontFamily: 'Montserrat'
    }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
        <X size={18} />
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: color, fontWeight: '900', fontSize: '12px', letterSpacing: '1px' }}>
        {notif.tipo === 'movimento' ? <RefreshCw size={16}/> : <MessageSquare size={16}/>}
        {notif.titulo.toUpperCase()}
      </div>

      <div style={{ fontSize: '15px', color: '#1e293b', lineHeight: '1.4', fontWeight: '400' }}>
        {notif.mensagem}
      </div>

      {notif.detalhes && (
        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: '400' }}>
          {notif.detalhes}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE DE FUNDO COM OBJETOS ABSTRATOS ---
function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=2070&auto=format&fit=crop" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" style={{ position: 'absolute', top: '25%', left: '10%', width: '600px', opacity: 0.08, filter: 'blur(2px)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- TELA DE CARREGAMENTO ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.4' }}>
            Comunicação Financeiro <br /> 
            <b style={{ fontWeight: '900', fontSize: '32px' }}>Nova Tratores</b>
        </h1>
    </div>
  )
}

const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null' || typeof dataStr !== 'string') return '';
  const partes = dataStr.split('-');
  return partes.length !== 3 ? dataStr : `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// --- 1. CHAT INTERNO (DENTRO DOS CARDS) ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMsg, setNovaMsg] = useState('')
  const scrollRef = useRef()

  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true })
      .then(({ data }) => setMensagens(data || []))

    const channel = supabase.channel(`chat_card_${chamadoId}`).on('postgres_changes', { 
      event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` 
    }, payload => { 
      if (String(payload.new.usuario_id) !== String(userProfile.id)) setMensagens(prev => [...(prev || []), payload.new]) 
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id])

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens])

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return
    const texto = novaMsg; setNovaMsg('')
    const { error } = await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }])
    if (error) alert("Erro: " + error.message)
    else setMensagens(prev => [...(prev || []), { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '500', fontSize: '10px', color: '#000' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {(mensagens || []).map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth: '85%' }}>
            <b style={{ fontSize: '8px', opacity: 0.5, display: 'block', marginBottom: '4px' }}>{m.usuario_nome?.toUpperCase()}</b>
            <span style={{ fontSize: '14px' }}>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
        <button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button>
      </form>
    </div>
  )
}

// --- 2. CHAT FLUTUANTE GERAL ---
function ChatFlutuante({ userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  const marcarComoVisto = async (msgs) => {
    if (!isOpen || !userProfile?.id) return;
    const naoVistas = msgs.filter(m => m.usuario_id !== userProfile.id && !(m.visualizado_por || []).some(v => v.id === userProfile.id));
    for (const msg of naoVistas) {
      const novaVisualizacao = { id: userProfile.id, nome: userProfile.nome };
      const novaLista = [...(msg.visualizado_por || []), novaVisualizacao];
      await supabase.from('mensagens_chat').update({ visualizado_por: novaLista }).eq('id', msg.id);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;
    const load = async () => {
        const { data } = await supabase.from('mensagens_chat').select('*').is('chamado_id', null).order('created_at', { ascending: true }).limit(100);
        setMensagens(data || []);
        marcarComoVisto(data || []);
    }
    load();
    const channel = supabase.channel('chat_geral_home').on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_chat' }, 
      p => { load() }
    ).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [userProfile?.id, isOpen]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [mensagens, isOpen]);

  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return;
    const t = novaMsg; setNovaMsg('');
    await supabase.from('mensagens_chat').insert([{ 
      texto: t, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: null, 
      data_hora: new Date().toISOString(), visualizado_por: [{ id: userProfile.id, nome: userProfile.nome }] 
    }]);
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('chat-midia').upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('chat-midia').getPublicUrl(fileName);
      await supabase.from('mensagens_chat').insert([{
        texto: file.type.startsWith('image') ? '📷 Foto' : '📎 Arquivo',
        midia_url: publicUrl, usuario_id: userProfile.id, usuario_nome: userProfile.nome, 
        chamado_id: null, data_hora: new Date().toISOString(), visualizado_por: [{ id: userProfile.id, nome: userProfile.nome }]
      }]);
    } catch (err) { alert("Erro upload: " + err.message); }
    finally { setUploading(false); }
  }

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 3000, fontFamily: 'Montserrat' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ width: '75px', height: '75px', borderRadius: '25px', background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {isOpen ? <X size={34} /> : <MessageSquare size={34} />}
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', bottom: '95px', right: 0, width: '500px', height: '750px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderRadius: '35px', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 70px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0', overflow:'hidden' }}>
           <div style={{ padding: '25px', background: '#0f172a', color: '#fff', fontWeight: '500', fontSize:'18px' }}>CENTRAL DE COMUNICAÇÃO NOVA</div>
           
           <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {(mensagens || []).map(m => {
                const souEu = String(m.usuario_id) === String(userProfile.id);
                const hora = m.data_hora ? new Date(m.data_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                const quemViu = (m.visualizado_por || []).filter(v => v.id !== m.usuario_id).map(v => v.nome).join(', ');

                return (
                  <div key={m.id} style={{ alignSelf: souEu ? 'flex-end' : 'flex-start', maxWidth:'80%' }}>
                    <div style={{ background: souEu ? '#0f172a' : '#fff', color: souEu ? '#fff' : '#000', padding: '15px', borderRadius: '20px', border:'1px solid #e2e8f0', boxShadow: '0 5px 10px rgba(0,0,0,0.03)' }}>
                      <b style={{fontSize:'10px', display:'block', opacity:0.6, marginBottom:'6px'}}>{m.usuario_nome?.toUpperCase()}</b>
                      {m.midia_url && (
                        <div style={{marginBottom:'12px'}}>
                          {m.midia_url.match(/\.(jpeg|jpg|gif|png)$/) 
                            ? <img src={m.midia_url} style={{width:'100%', borderRadius:'12px', cursor:'pointer'}} onClick={()=>window.open(m.midia_url)} />
                            : <a href={m.midia_url} target="_blank" style={{display:'flex', alignItems:'center', gap:'10px', background:'rgba(0,0,0,0.07)', padding:'12px', borderRadius:'12px', textDecoration:'none', color:'inherit', fontSize:'13px', fontWeight:'500'}}><FileText size={18}/> VER DOCUMENTO</a>}
                        </div>
                      )}
                      <div style={{fontSize:'16px', lineHeight:'1.5'}}>{m.texto}</div>
                      <div style={{textAlign:'right', fontSize:'11px', opacity:0.6, marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'8px'}}>
                        <span>{hora}</span>
                        {souEu && (
                          <div className="tooltip-container" style={{display:'flex', alignItems:'center', gap:'2px', color: quemViu ? '#38bdf8' : '#94a3b8'}}>
                             <Eye size={18} style={{cursor:'pointer'}} />
                             {quemViu && <div className="tooltip-box">Visto por: {quemViu}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
           </div>

           <form onSubmit={enviar} style={{ padding: '25px', display: 'flex', gap: '15px', borderTop:'1px solid #e2e8f0', alignItems:'center' }}>
              <label style={{cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:'55px', height:'55px', borderRadius:'15px', background:'#f1f5f9', color:'#64748b'}}>
                <Paperclip size={26} />
                <input type="file" hidden onChange={handleUpload} disabled={uploading} />
              </label>
              <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder={uploading ? "Subindo arquivo..." : "Escreva sua mensagem..."} style={{flex:1, padding:'18px', borderRadius:'15px', border:'1px solid #e2e8f0', fontSize:'16px', outline:'none', background:'#f8fafc'}} />
              <button disabled={uploading} style={{background:'#0f172a', color:'#fff', border:'none', borderRadius:'15px', width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}><Send size={24}/></button>
           </form>
        </div>
      )}
    </div>
  );
}

// --- 3. PÁGINA HOME PRINCIPAL ---
export default function Home() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showNovoMenu, setShowNovoMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null)
  const [listaBoletos, setListaBoletos] = useState([])
  const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]); const [listaRH, setListaRH] = useState([]);
  const [notificacoes, setNotificacoes] = useState([])
  const [toasts, setToasts] = useState([]) // ESTADO PARA NOTIFICAÇÕES INVASIVAS
  const [fileBoleto, setFileBoleto] = useState(null) // ARQUIVO PARA AÇÃO DO FINANCEIRO
  const router = useRouter()

  // FUNÇÃO PARA ADICIONAR NOTIFICAÇÃO INVASIVA
  const addToast = (notif) => {
    const id = Date.now();
    setToasts(prev => [{...notif, id}, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 10000); 
  };

  const carregarDados = async () => {
    const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false})
    
    const hoje = new Date();
    (bolds || []).forEach(async b => {
      if (b.vencimento_boleto && new Date(b.vencimento_boleto) < hoje && b.status !== 'pago' && b.status !== 'vencido') {
         await supabase.from('Chamado_NF').update({ status: 'vencido', tarefa: 'Cobrar Cliente', data_entrada_vencido: new Date().toISOString() }).eq('id', b.id);
      }
    });

    let tarefasFaturamento = [];
    (bolds || []).forEach(t => {
      if (userProfile?.funcao === 'Financeiro') {
        if (t.status === 'gerar_boleto' || t.status === 'validar_pix' || t.status === 'pago') {
          tarefasFaturamento.push({ ...t, valor_exibicao: t.valor_servico });
        }
      } else {
        if (t.status === 'enviar_cliente' || t.tarefa === 'Cobrar Cliente') {
           tarefasFaturamento.push({ ...t, valor_exibicao: t.valor_servico });
        }
        for (let i = 1; i <= 5; i++) {
           const statusParc = t[`status_p${i}`];
           const tarefaParc = t[`tarefa_p${i}`];
           const valorParc = t[`valor_parcela${i}`] || (t.valor_servico / (t.qtd_parcelas || 1)).toFixed(2);
           if (statusParc === 'enviar_cliente' || tarefaParc === 'Cobrar Cliente') {
             tarefasFaturamento.push({
               ...t,
               id_virtual: `${t.id}_p${i}`, 
               numParcRef: i,
               nom_cliente: `${t.nom_cliente} (PARC ${i})`,
               valor_exibicao: valorParc,
               tarefa: tarefaParc,
               status: statusParc,
               isParcelaReal: true
             });
           }
        }
      }
    });

    setListaBoletos(tarefasFaturamento);

    const { data: pag } = await supabase.from('finan_pagar').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const { data: rec } = await supabase.from('finan_receber').select('*').neq('status', 'concluido').order('id', {ascending: false})
    const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido').order('id', {ascending: false})
    
    setListaRH(rhData || [])
    if (userProfile?.funcao === 'Financeiro') {
      setListaPagar((pag || []).filter(i => i.status === 'financeiro')); setListaReceber((rec || []).filter(i => i.status === 'financeiro'))
    } else {
      setListaPagar((pag || []).filter(i => i.status === 'pos_vendas')); setListaReceber((rec || []).filter(i => i.status === 'pos_vendas'))
    }
  }

  useEffect(() => {
    const carregarPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single()
      setUserProfile(prof)
      setLoading(false)
    }
    carregarPerfil()
  }, [router])

  useEffect(() => {
    if (userProfile) {
      carregarDados();
      
      const channelChat = supabase.channel('chat_notifications_home')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat' }, async payload => {
            if (payload.new.usuario_id === userProfile.id) return;
            let titulo = "MENSAGEM GERAL";
            let mensagem = `Nova mensagem de ${payload.new.usuario_nome}`;
            let detalhes = payload.new.texto;
            if (payload.new.chamado_id) {
               const { data: card } = await supabase.from('Chamado_NF').select('nom_cliente').eq('id', payload.new.chamado_id).single();
               titulo = "MENSAGEM NO CARD";
               mensagem = `ID: #${payload.new.chamado_id} - Cliente: ${card?.nom_cliente}`;
            }
            setNotificacoes(prev => [{ titulo, mensagem, detalhes, data: new Date().toISOString() }, ...prev]);
            addToast({ tipo: 'chat', titulo, mensagem, detalhes, isGeral: !payload.new.chamado_id });
        }).subscribe();

      const channelMove = supabase.channel('move_notifications_home')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Chamado_NF' }, payload => {
            if (payload.old.status !== payload.new.status) {
              const info = payload.new;
              const titulo = "CARD MOVIMENTADO";
              const mensagem = `O card de ${info.nom_cliente} mudou para ${info.status.toUpperCase()}`;
              const detalhes = `ID: #${info.id} | NF Serviço: ${info.num_nf_servico || '-'} | NF Peça: ${info.num_nf_peca || '-'}`;
              setNotificacoes(prev => [{ titulo, mensagem, detalhes, data: new Date().toISOString() }, ...prev]);
              addToast({ tipo: 'movimento', titulo, mensagem, detalhes });
            }
            carregarDados();
        }).subscribe();

      return () => { 
        supabase.removeChannel(channelChat);
        supabase.removeChannel(channelMove);
      };
    }
  }, [userProfile]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleUpdateField = async (id, table, field, value) => {
    const finalValue = (value === "" && (field.includes('data') || field.includes('vencimento'))) ? null : value;
    if (typeof id === 'string' && id.includes('_p')) {
        const [idReal, pNum] = id.split('_p');
        const fieldNameIndividual = `${field}_p${pNum}`;
        await supabase.from('Chamado_NF').update({ [fieldNameIndividual]: finalValue }).eq('id', idReal);
    } else {
        const updateData = { [field]: finalValue };
        if (field === 'status' && value === 'vencido') {
          updateData.data_entrada_vencido = new Date().toISOString();
        }
        await supabase.from(table).update(updateData).eq('id', id);
    }
    carregarDados();
    setTarefaSelecionada(null);
  };

  const handleUpdateFile = async (id, table, field, file) => {
    if(!file) return;
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const path = `anexos/${Date.now()}-${file.name}`;
    await supabase.storage.from('anexos').upload(path, file);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    await supabase.from(table).update({ [field]: data.publicUrl }).eq('id', idReal);
    alert("Arquivo atualizado!"); carregarDados();
  };

  const handleIncrementRecobranca = async (id, currentVal) => {
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const newVal = (currentVal || 0) + 1;
    await supabase.from('Chamado_NF').update({ recombrancas_qtd: newVal }).eq('id', idReal);
    setTarefaSelecionada(prev => ({...prev, recombrancas_qtd: newVal}));
  };

  const handleGerarBoletoFinanceiro = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto.");
    const idReal = typeof id === 'string' && id.includes('_p') ? id.split('_p')[0] : id;
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    try {
      await supabase.storage.from('anexos').upload(path, fileBoleto);
      const { data } = supabase.storage.from('anexos').getPublicUrl(path);
      if (typeof id === 'string' && id.includes('_p')) {
          const pNum = id.split('_p')[1];
          await supabase.from('Chamado_NF').update({ [`status_p${pNum}`]: 'enviar_cliente', [`tarefa_p${pNum}`]: 'Enviar Boleto para o Cliente', anexo_boleto: data.publicUrl }).eq('id', idReal);
      } else {
          await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq('id', idReal);
      }
      alert("Tarefa gerada!"); setFileBoleto(null); setTarefaSelecionada(null); carregarDados();
    } catch (err) { alert("Erro: " + err.message); }
  };

  const btnSidebarStyle = {
    background: 'none', color: '#000', border: 'none', padding: '20px 0', cursor: 'pointer',
    fontSize: '18px', fontWeight: '500', display: 'flex', alignItems: 'center', width: '100%', transition: '0.3s'
  }
  const iconContainer = { minWidth: '85px', display: 'flex', justifyContent: 'center', alignItems: 'center' }

  if (loading) return <LoadingScreen />

  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', background: 'transparent' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      <GeometricBackground />

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {toasts.map(t => (
          <NotificationToast key={t.id} notif={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>

      <aside onMouseEnter={()=>setIsSidebarOpen(true)} onMouseLeave={()=>setIsSidebarOpen(false)} style={{ width: isSidebarOpen ? '320px' : '85px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #cbd5e1', padding: '30px 0', display: 'flex', flexDirection: 'column', transition: '0.4s ease', zIndex: 1100, overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                {isSidebarOpen ? <b style={{color:'#000', fontSize:'22px', fontWeight: '500', letterSpacing:'3px'}}>NOVA</b> : <Menu size={32} color="#000" />}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => router.push('/')} style={{...btnSidebarStyle, borderLeft: path === '/' ? '6px solid #000' : 'none', background: path === '/' ? 'rgba(0,0,0,0.02)' : 'none' }}><div style={iconContainer}><LayoutDashboard size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>TAREFAS</span></button>
                <button onClick={() => router.push('/kanban')} style={{...btnSidebarStyle, borderLeft: path === '/kanban' ? '6px solid #000' : 'none', background: path === '/kanban' ? 'rgba(0,0,0,0.02)' : 'none' }}><div style={iconContainer}><ClipboardList size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Fluxo de Boletos</span></button>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '20px 0', opacity: isSidebarOpen ? 1 : 0 }}></div>
                <button onClick={() => router.push('/historico-pagar')} style={btnSidebarStyle}><div style={iconContainer}><TrendingDown size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Historico Pagar</span></button>
                <button onClick={() => router.push('/historico-receber')} style={btnSidebarStyle}><div style={iconContainer}><TrendingUp size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Historico Receber</span></button>
                <button onClick={() => router.push('/historico-rh')} style={btnSidebarStyle}><div style={iconContainer}><UserCheck size={28} color="#000" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0, transition: '0.3s', whiteSpace: 'nowrap' }}>Historico RH</span></button>
            </nav>
        </div>
        <div style={{ paddingBottom: '20px' }}>
            <button onClick={handleLogout} style={{ ...btnSidebarStyle, color: '#dc2626' }}><div style={iconContainer}><LogOut size={28} color="#dc2626" /></div><span style={{ opacity: isSidebarOpen ? 1 : 0 }}>SAIR</span></button>
        </div>
      </aside>

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', zIndex: 1, position: 'relative', background: 'transparent', transition: '0.4s ease' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
            <div><h1 style={{ fontWeight: '500', color: '#0f172a', margin: 0, fontSize:'32px', letterSpacing:'-1.5px' }}>Painel de Trabalho</h1><div style={{ width: '60px', height: '4px', background: '#0f172a', marginTop: '12px' }}></div></div>
            <div style={{ display:'flex', gap:'35px', alignItems:'center', position:'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255,255,255,0.6)', padding: '12px 25px', borderRadius: '25px', border: '1px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '65px', height: '65px', borderRadius: '20px', overflow: 'hidden', background: '#000', border: '2px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                    {userProfile?.avatar_url ? <img src={userProfile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover'}} /> : <User color="#fff" style={{padding:'12px'}} size={40}/>}
                  </div>
                  <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                    <b style={{ block: 'block', fontSize: '16px', color: '#0f172a', fontWeight: '500', letterSpacing:'-0.5px' }}>{userProfile?.nome?.toUpperCase()}</b>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{userProfile?.funcao}</span>
                  </div>
                </div>

                <div onClick={() => setShowNotifMenu(!showNotifMenu)} style={{ cursor:'pointer', color:'#0f172a', position:'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={36} strokeWidth={1.5} />
                  {notificacoes.length > 0 && <div style={{position:'absolute', top:0, right:0, background:'red', width:'12px', height:'12px', borderRadius:'50%'}}></div>}
                  {showNotifMenu && (
                    <div onMouseLeave={() => setShowNotifMenu(false)} style={{ position: 'absolute', top: '55px', right: 0, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(10px)', padding: '25px', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', zIndex: 2000, width: '400px', maxHeight: '500px', overflowY: 'auto' }}>
                      <div style={{ fontWeight: '900', fontSize: '12px', color: '#94a3b8', marginBottom: '15px', letterSpacing: '1px' }}>HISTÓRICO RECENTE</div>
                      {notificacoes.length > 0 ? notificacoes.map((n, i) => (
                        <div key={i} style={{ padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{fontWeight: '700', fontSize: '14px', color: '#0f172a'}}>{n.titulo}</div>
                          <div style={{fontSize: '13px', color: '#334155'}}>{n.mensagem}</div>
                          <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '5px'}}>{new Date(n.data).toLocaleTimeString()}</div>
                        </div>
                      )) : <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '700' }}>Sem notificações</span>}
                    </div>
                  )}
                </div>

                <div onClick={() => setShowConfigMenu(!showConfigMenu)} style={{ cursor:'pointer', color:'#0f172a', position:'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={36} strokeWidth={1.5} className="hover-rotate" />
                  {showConfigMenu && (
                    <div onMouseLeave={() => setShowConfigMenu(false)} style={{ position: 'absolute', top: '55px', right: 0, background: '#fff', padding: '10px 0', borderRadius: '15px', boxShadow: '0 15px 40px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1', zIndex: 2000, width: '200px' }}>
                       <div onClick={() => router.push('/configuracoes')} style={{ padding: '15px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}>PERFIL</div>
                       <div style={{ padding: '15px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', borderBottom: '1px solid #f1f5f9', opacity: 0.5 }}>SOM</div>
                       <div style={{ padding: '15px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', opacity: 0.5 }}>TEMA</div>
                    </div>
                  )}
                </div>

                <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'20px 40px', borderRadius:'15px', fontWeight:'900', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', gap:'12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                  <PlusCircle size={26} strokeWidth={2.5} /> NOVO CHAMADO
                </button>
                {showNovoMenu && (
                  <div onMouseLeave={() => setShowNovoMenu(false)} style={{ position:'absolute', top:'85px', right: 0, background:'#fff', borderRadius:'20px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', zIndex:2000, width:'320px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                    <div onClick={() => router.push('/novo-chamado-nf')} style={{ padding:'25px', cursor:'pointer', fontSize:'16px', fontWeight:'500', borderBottom:'1px solid #f1f5f9' }} className="hover-item">CHAMADO DE BOLETO</div>
                    <div onClick={() => router.push('/novo-pagar-receber')} style={{ padding:'25px', cursor:'pointer', fontSize:'16px', fontWeight:'500', borderBottom:'1px solid #f1f5f9' }} className="hover-item">CONTAS PAGAR / RECEBER</div>
                    <div onClick={() => router.push('/novo-chamado-rh')} style={{ padding:'25px', cursor:'pointer', fontSize:'16px', fontWeight:'500', color: '#2563eb' }} className="hover-item">CHAMADO RH</div>
                  </div>
                )}
            </div>
        </header>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontWeight: '400', fontSize: '24px', color: '#0f172a'}}>FATURAMENTO</div>
                {(listaBoletos || []).map(t => {
                   const isRed = (t.status === 'vencido' || t.tarefa === 'Cobrar Cliente');
                   return (
                    <div key={t.id_virtual || t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} className="task-card" style={{ background: isRed ? '#fee2e2' : 'rgba(255,255,255,0.95)', border: isRed ? '1px solid #ef4444' : '1px solid #cbd5e1' }}>
                      <div style={{ background: isRed ? '#ef4444' : '#1e293b', padding: '25px', color: '#fff' }}><h4 style={{ margin: 0, fontSize: '28px', fontWeight: '500' }}>{t.nom_cliente?.toUpperCase()}</h4></div>
                      <div style={{ padding: '25px' }}>
                        <span className="payment-badge" style={{fontWeight: 400}}>{t.forma_pagamento?.toUpperCase()}</span>
                        <div style={{ marginTop: '15px', fontSize: '22px', fontWeight: '500', color: '#0f172a' }}>R$ {t.valor_exibicao}</div>
                        {isRed && <div style={{marginTop:'10px', color:'#ef4444', fontWeight:'900', fontSize:'12px'}}>{t.tarefa?.toUpperCase()}</div>}
                      </div>
                    </div>
                   )
                })}
            </div>
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontWeight: '400', fontSize: '24px', color: '#0f172a'}}>CONTAS PAGAR / RECEBER</div>
                {(listaPagar || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'pagar' })} className="task-card" style={{borderLeft:'12px solid #ef4444', padding:'30px'}}><h4 style={{margin: '0 0 10px 0', fontSize:'24px', fontWeight:'500'}}>{t.fornecedor?.toUpperCase()}</h4><span className="payment-badge" style={{background:'#000', color:'#fff'}}>{t.forma_pagamento?.toUpperCase() || 'PAGAMENTO'}</span><div style={{marginTop:'15px', fontSize:'22px', fontWeight:'500'}}>R$ {t.valor}</div></div>))}
                {(listaReceber || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'receber' })} className="task-card" style={{borderLeft:'12px solid #3b82f6', padding:'30px'}}><h4 style={{margin: '0 0 10px 0', fontSize:'24px', fontWeight:'500'}}>{t.cliente?.toUpperCase()}</h4><span className="payment-badge" style={{background:'#000', color:'#fff'}}>{t.forma_pagamento?.toUpperCase() || 'RECEBIMENTO'}</span><div style={{marginTop:'15px', fontSize:'22px', fontWeight:'500'}}>R$ {t.valor}</div></div>))}
            </div>
            <div style={{flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '30px'}}><div style={{padding: '15px', textAlign: 'center', fontWeight: '400', fontSize: '24px', color: '#0f172a'}}>RH</div>
                {(listaRH || []).map(t => (<div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'rh' })} className="task-card" style={{padding:'30px'}}><h4 style={{margin:'0', fontSize:'24px', fontWeight:'500'}}>{(t.funcionario || t.titulo || 'RH').toUpperCase()}</h4><span className="payment-badge" style={{background:'#000', color:'#fff', marginTop:'10px'}}>CHAMADO RH</span></div>))}
            </div>
        </div>
      </main>

      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '35px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 50px 100px rgba(0,0,0,0.2)' }}>
            
            <div style={{ flex: '1 1 900px', padding: '60px', overflowY: 'auto', maxHeight: '95vh' }}>
              <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={16}/> VOLTAR</button>
              
              <div style={{ marginBottom: '40px' }}>
                <label style={{ fontSize: '10px', color: '#000', fontWeight: '500', letterSpacing: '1px' }}>INFORMAÇÕES DO PROCESSO</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    {/* DESTAQUE NOME CLIENTE E PAGAMENTO (FONT 400) */}
                    <h2 style={{ fontSize: '56px', fontWeight: '400', color: '#0f172a', margin: 0 }}>{tarefaSelecionada.nom_cliente?.toUpperCase() || tarefaSelecionada.fornecedor?.toUpperCase() || tarefaSelecionada.cliente?.toUpperCase() || tarefaSelecionada.funcionario?.toUpperCase()}</h2>
                    <div style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', borderRadius: '12px', display: 'inline-block', marginTop: '10px', fontSize: '20px', fontWeight: '400' }}>
                       {tarefaSelecionada.forma_pagamento?.toUpperCase() || 'MÉTODO NÃO INFORMADO'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     {/* DESTAQUE VALOR (FONT 400) */}
                     <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '400' }}>{tarefaSelecionada.isChild ? 'VALOR DA PARCELA' : 'VALOR TOTAL'}</div>
                     <div style={{ fontSize: '56px', color: '#0f172a', fontWeight: '400' }}>R$ {tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor || tarefaSelecionada.valor_servico}</div>
                  </div>
                </div>
              </div>

              {/* GRID LIMPO: REMOVIDO SETOR E STATUS ATUAL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e2e8f0', borderRadius: '15px', overflow: 'hidden' }}>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>ID PROCESSO</div><span>#{tarefaSelecionada.id}</span></div>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>NF PEÇA (EDITAR)</div><input className="edit-input" defaultValue={tarefaSelecionada?.num_nf_peca} onBlur={(e) => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'num_nf_peca', e.target.value)} /></div>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>NF SERVIÇO (EDITAR)</div><input className="edit-input" defaultValue={tarefaSelecionada?.num_nf_servico} onBlur={(e) => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'num_nf_servico', e.target.value)} /></div>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>VENCIMENTO (EDITAR)</div><input type="date" className="edit-input" defaultValue={tarefaSelecionada?.vencimento_boleto || tarefaSelecionada?.data_vencimento} onBlur={(e) => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'vencimento_boleto', e.target.value)} /></div>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>RECOBRANÇAS</div><span>{tarefaSelecionada.recombrancas_qtd || 0} vezes</span></div>
                 <div className="info-block-grid"><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>QTD PARCELAS</div><span>{tarefaSelecionada.qtd_parcelas || 1}x</span></div>
                 <div className="info-block-grid" style={{gridColumn: 'span 3'}}><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>DATAS PARCELAS</div><span>{tarefaSelecionada.datas_parcelas || 'N/A'}</span></div>
                 <div className="info-block-grid" style={{gridColumn: 'span 3'}}><div style={{fontSize: '11px', color: '#000', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '500'}}>OBSERVAÇÃO (EDITAR)</div><input className="edit-input" defaultValue={tarefaSelecionada?.obs} onBlur={(e) => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'obs', e.target.value)} /></div>
              </div>

              {/* BLOCO DA AÇÃO DO FINANCEIRO - APENAS NA FASE GERAR BOLETO */}
              {userProfile?.funcao === 'Financeiro' && (tarefaSelecionada.status === 'gerar_boleto') && (
                <div style={{ marginTop: '50px', padding: '40px', background: '#f0f9ff', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '11px', color: '#0369a1', letterSpacing: '2px', display:'block', marginBottom: '20px', fontWeight:'900' }}>AÇÃO DO FINANCEIRO</span>
                    <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'15px', background:'#fff', padding:'25px', borderRadius:'20px', border:'2px dashed #3b82f6', cursor:'pointer', marginBottom:'25px' }}>
                        <Upload size={32} color="#3b82f6" />
                        <div style={{textAlign:'left'}}><span style={{fontSize:'16px', color:'#1d4ed8', display:'block', fontWeight:'500'}}>{fileBoleto ? fileBoleto.name : 'CLIQUE PARA ANEXAR O BOLETO'}</span><span style={{fontSize:'12px', color:'#60a5fa'}}>Clique para selecionar o arquivo</span></div>
                        <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                    </label>
                    <button onClick={() => handleGerarBoletoFinanceiro(tarefaSelecionada.id_virtual || tarefaSelecionada.id)} style={{ width: '100%', background: '#0f172a', color: '#fff', padding: '22px', borderRadius: '20px', cursor: 'pointer', fontSize: '16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', fontWeight:'500' }}>
                        <Send size={20}/> Gerar Tarefa para Pós Vendas: Enviar Boleto
                    </button>
                </div>
              )}

              <div style={{marginTop: '30px', display: 'flex', gap: '15px', flexDirection: 'column'}}>
                
                {/* LÓGICA PIX: MOSTRAR COMPROVANTE E BOTÃO DE PAGO */}
                {tarefaSelecionada.forma_pagamento?.toLowerCase() === 'pix' && (
                  <div style={{background:'#f0fdf4', padding:'30px', borderRadius:'20px', border:'1px solid #bbf7d0', marginBottom:'15px'}}>
                     <h4 style={{color:'#166534', marginBottom:'15px', fontWeight:'900'}}>PAGAMENTO VIA PIX</h4>
                     {tarefaSelecionada.comprovante_pagamento && (
                       <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" className="btn-anexo-doc" style={{marginBottom:'15px', color:'#166534', borderColor:'#166534'}}>
                         <Download size={18}/> VER COMPROVANTE DE PAGAMENTO
                       </a>
                     )}
                     <button onClick={() => handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'status', 'pago')} style={{width:'100%', background:'#166534', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>CONFERIDO: MOVER PARA PAGO</button>
                  </div>
                )}

                {/* BOTÃO MOVER PARA CONCLUÍDO (PAGAR / RECEBER) */}
                {(tarefaSelecionada.gTipo === 'pagar' || tarefaSelecionada.gTipo === 'receber') && (
                  <button onClick={() => handleUpdateField(tarefaSelecionada.id, tarefaSelecionada.gTipo === 'pagar' ? 'finan_pagar' : 'finan_receber', 'status', 'concluido')} style={{background:'#0f172a', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>MOVER PARA CONCLUÍDO (HISTÓRICO)</button>
                )}

                {tarefaSelecionada.tarefa === 'Cobrar Cliente' && tarefaSelecionada.forma_pagamento?.toLowerCase() !== 'pix' && (
                  <button onClick={() => {
                    handleIncrementRecobranca(tarefaSelecionada.id_virtual || tarefaSelecionada.id, tarefaSelecionada.recombrancas_qtd);
                    handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'tarefa', 'Aguardando Verificação Financeiro (Cobrado)');
                    alert("Cobrança registrada com sucesso!");
                  }} style={{background:'#22c55e', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', cursor:'pointer', fontWeight:'900'}}>REGISTRAR CLIENTE COBRADO</button>
                )}

                {userProfile?.funcao !== 'Financeiro' && tarefaSelecionada.status === 'enviar_cliente' && (
                   <button onClick={() => { 
                      handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'status', 'aguardando_vencimento'); 
                      handleUpdateField(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'tarefa', 'Aguardando Vencimento'); 
                      alert("Boleto enviado!"); 
                   }} style={{background:'#22c55e', color:'#fff', border:'none', padding:'15px 30px', borderRadius:'12px', cursor:'pointer', fontWeight:'900'}}>Confirmar Envio de Boleto</button>
                )}
              </div>

              <div style={{ marginTop: '40px' }}>
                <label className="label-section">ANEXOS (CLIQUE NO ÍCONE PARA TROCAR)</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                   <div className="btn-anexo-doc"><label className="cursor-pointer flex items-center gap-2"><RefreshCw size={16}/> NF SERV <input type="file" hidden onChange={(e) => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'anexo_nf_servico', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank"><Eye size={16}/></a>}</div>
                   <div className="btn-anexo-doc"><label className="cursor-pointer flex items-center gap-2"><RefreshCw size={16}/> NF PEÇA <input type="file" hidden onChange={(e) => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'anexo_nf_peca', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank"><Eye size={16}/></a>}</div>
                   <div className="btn-anexo-doc"><label className="cursor-pointer flex items-center gap-2"><RefreshCw size={16}/> BOLETO <input type="file" hidden onChange={(e) => handleUpdateFile(tarefaSelecionada.id_virtual || tarefaSelecionada.id, 'Chamado_NF', 'anexo_boleto', e.target.files[0])} /></label>{tarefaSelecionada.anexo_boleto && <a href={tarefaSelecionada.anexo_boleto} target="_blank"><Eye size={16}/></a>}</div>
                   {tarefaSelecionada.anexo_boleto_juros && <div className="btn-anexo-doc" style={{borderColor:'#ef4444'}}><label className="flex items-center gap-2" style={{color:'#ef4444'}}><RefreshCw size={16}/> BOLETO JUROS</label><a href={tarefaSelecionada.anexo_boleto_juros} target="_blank"><Download size={16} color="#ef4444"/></a></div>}
                </div>
              </div>
            </div>
            <div style={{ flex: '1 1 500px', padding: '40px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
              {userProfile && <ChatChamado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />}
            </div>
          </div>
        </div>
      )}

      {userProfile && <ChatFlutuante userProfile={userProfile} />}
      
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        * { font-weight: 400 !important; }
        b, h1, h2, h3, h4, .btn-back, .edit-input { font-weight: 500 !important; }
        .sidebar-btn { background:none; color:#000; border:none; padding:20px 0; cursor:pointer; fontSize:18px; display:flex; alignItems:center; width:100%; transition:0.3s; }
        .sidebar-icon { min-width: 85px; display:flex; justifyContent:center; alignItems:center; }
        .col-container { flex: 1; min-width: 380px; display: flex; flexDirection: column; gap: 20px; }
        .task-card { background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 20px; cursor: pointer; overflow: hidden; width: 100%; box-shadow: 0 10px 15px rgba(0,0,0,0.05); transition: 0.2s; }
        .task-card:hover { transform: translateY(-5px); box-shadow: 0 15px 25px rgba(0,0,0,0.1); }
        .payment-badge { background: #000; color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 12px; display: inline-block; font-weight: 400 !important; }
        .info-block-grid { padding: 15px; border: 0.5px solid #e2e8f0; background: #fff; display: flex; flex-direction: column; justify-content: center; }
        .info-block-grid span, .info-block-grid .edit-input { fontSize: 15px; color: #0f172a; font-weight: 500 !important; }
        .edit-input { border:none; fontSize:15px; width:100%; outline:none; color:#0f172a; background:transparent; }
        .btn-back { background: #0f172a; border: none; color: #fff; padding: 12px 24px; borderRadius: 12px; cursor: pointer; fontSize:12px; marginBottom: 30px; display:flex; alignItems:center; gap:8px; font-weight: 900 !important; }
        .btn-anexo-doc { padding: 12px 20px; background: #fff; border: 1px solid #cbd5e1; borderRadius: 12px; color: #0f172a; display: flex; alignItems: center; gap: 10px; font-size: 13px; text-decoration: none; }
        .label-section { display:block; fontSize:12px; color:#000; margin-bottom: 15px; text-transform: uppercase; }
        .tooltip-container { position: relative; display: flex; align-items: center; }
        .tooltip-box { visibility: hidden; background-color: #000; color: #fff; text-align: center; padding: 12px 18px; border-radius: 12px; position: absolute; z-index: 5000; bottom: 125%; right: 0; width: 300px; font-size: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); opacity: 0; transition: 0.3s; pointer-events: none; }
        .tooltip-container:hover .tooltip-box { visibility: visible; opacity: 1; }
      `}</style>
    </div>
  )
}
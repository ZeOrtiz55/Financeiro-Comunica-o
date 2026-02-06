'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
// ÍCONES
import { 
 Bell, MessageSquare, X, Menu, PlusCircle, FileText, Download, 
 CheckCircle, LogOut, User, ShieldCheck, Upload, Send, 
 Calendar, CreditCard, Hash, History, ArrowLeft, Paperclip, ImageIcon, 
 CheckCheck, Eye, LayoutDashboard, ClipboardList, UserCheck, TrendingUp, TrendingDown, Settings, Trash2, Edit3, RefreshCw, AlertCircle, Trash
} from 'lucide-react'

// --- 1. TELA DE CARREGAMENTO ---
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;900&display=swap" rel="stylesheet" />
        <h1 style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: '300', fontSize: '28px', letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center' }}>PAINEL FINANCEIRO <br /><b style={{ fontWeight: '900', fontSize: '32px' }}>Nova Tratores</b></h1>
    </div>
  )
}

// --- 2. FORMATADOR DE DATA (DD/MM/YYYY) ---
const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'null') return 'N/A';
  const apenasData = dataStr.split(' ')[0]; // Remove timestamp se houver
  const partes = apenasData.split(/[-/]/);
  if (partes.length === 3) {
    if (partes[0].length === 4) { // Formato YYYY-MM-DD
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return `${partes[0]}/${partes[1]}/${partes[2]}`; // Já está DD-MM-YYYY
  }
  return dataStr;
};

function GeometricBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#f0f4f8', pointerEvents: 'none' }}>
      <img src="https://images.unsplash.com/photo-1633167606207-d840b5070fc2?q=80&w=900" style={{ position: 'absolute', top: '-15%', left: '-10%', width: '900px', opacity: 0.15, transform: 'rotate(-15deg)' }} alt="" />
      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '800px', opacity: 0.12, transform: 'rotate(10deg)' }} alt="" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(240, 244, 248, 0.4) 100%)' }}></div>
    </div>
  )
}

// --- 3. CHAT INTERNO DO PROCESSO ---
function ChatChamado({ chamadoId, userProfile }) {
  const [mensagens, setMensagens] = useState([]); const [novaMsg, setNovaMsg] = useState(''); const scrollRef = useRef();
  useEffect(() => {
    if (!chamadoId || !userProfile?.id) return;
    supabase.from('mensagens_chat').select('*').eq('chamado_id', chamadoId).order('created_at', { ascending: true }).then(({ data }) => setMensagens(data || []));
    const channel = supabase.channel(`chat_h_fin_${chamadoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `chamado_id=eq.${chamadoId}` }, payload => { 
      if (payload.new.usuario_id !== userProfile.id) setMensagens(prev => [...prev, payload.new]);
    }).subscribe();
    return () => { supabase.removeChannel(channel) }
  }, [chamadoId, userProfile?.id]);
  const enviar = async (e) => {
    e.preventDefault(); if (!novaMsg.trim()) return;
    const texto = novaMsg; setNovaMsg('');
    setMensagens(prev => [...prev, { id: Date.now(), texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id }]);
    await supabase.from('mensagens_chat').insert([{ texto, usuario_nome: userProfile.nome, usuario_id: userProfile.id, chamado_id: chamadoId }]);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #cbd5e1', borderRadius: '20px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '500', fontSize: '10px', color:'#000' }}>CONVERSA DO PROCESSO</div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mensagens.map((m) => (
          <div key={m.id} style={{ alignSelf: String(m.usuario_id) === String(userProfile?.id) ? 'flex-end' : 'flex-start', background: String(m.usuario_id) === String(userProfile?.id) ? '#1e293b' : '#f1f5f9', color: String(m.usuario_id) === String(userProfile?.id) ? '#fff' : '#000', padding: '12px 18px', borderRadius: '15px', maxWidth:'85%' }}>
            <b style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>{m.usuario_nome?.toUpperCase()}</b><span>{m.texto}</span>
          </div>
        ))}
      </div>
      <form onSubmit={enviar} style={{ padding: '15px', display: 'flex', gap: '10px' }}><input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} placeholder="Mensagem..." style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} /><button style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '10px', width: '45px' }}><Send size={18} /></button></form>
    </div>
  )
}

// --- HOME PRINCIPAL ---
export default function HomeFinanceiro() {
  const [userProfile, setUserProfile] = useState(null); const [loading, setLoading] = useState(true); const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNovoMenu, setShowNovoMenu] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [listaBoletos, setListaBoletos] = useState([]); const [listaPagar, setListaPagar] = useState([]); const [listaReceber, setListaReceber] = useState([]); const [listaRH, setListaRH] = useState([]);
  const [fileBoleto, setFileBoleto] = useState(null);
  const router = useRouter();

  const carregarDados = async () => {
    const { data: bolds } = await supabase.from('Chamado_NF').select('*').neq('status', 'concluido').order('id', {ascending: false});
    setListaBoletos((bolds || []).filter(t => ['gerar_boleto', 'validar_pix', 'pago'].includes(t.status)));
    const { data: pag } = await supabase.from('finan_pagar').select('*').eq('status', 'financeiro');
    const { data: rec } = await supabase.from('finan_receber').select('*').eq('status', 'financeiro');
    const { data: rhData } = await supabase.from('finan_rh').select('*').neq('status', 'concluido');
    setListaPagar(pag || []); setListaReceber(rec || []); setListaRH(rhData || []);
  }

  useEffect(() => {
    const carregar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      const { data: prof } = await supabase.from('financeiro_usu').select('*').eq('id', session.user.id).single();
      setUserProfile(prof); setLoading(false); carregarDados();
    }; carregar();
  }, [router]);

  const handleUpdateField = async (id, table, field, value) => {
    await supabase.from(table).update({ [field]: value }).eq('id', id); carregarDados();
  };

  const handleUpdateFile = async (id, table, field, file) => {
    if(!file) return;
    const path = `anexos/${Date.now()}-${file.name}`;
    await supabase.storage.from('anexos').upload(path, file);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    await supabase.from(table).update({ [field]: data.publicUrl }).eq(id);
    alert("Arquivo atualizado!"); carregarDados();
  };

  const handleGerarBoletoFinanceiro = async (id) => {
    if (!fileBoleto) return alert("Anexe o boleto.");
    const path = `boletos/${Date.now()}-${fileBoleto.name}`;
    await supabase.storage.from('anexos').upload(path, fileBoleto);
    const { data } = supabase.storage.from('anexos').getPublicUrl(path);
    await supabase.from('Chamado_NF').update({ status: 'enviar_cliente', tarefa: 'Enviar Boleto para o Cliente', setor: 'Pós-Vendas', anexo_boleto: data.publicUrl }).eq(id);
    alert("Tarefa gerada para Pós-Vendas!"); setTarefaSelecionada(null); carregarDados();
  };

  if (loading) return <LoadingScreen />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Montserrat, sans-serif', color:'#000' }}>
      <GeometricBackground />

      <MenuLateral isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} path="/home-financeiro" router={router} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} userProfile={userProfile} />

      <main style={{ marginLeft: isSidebarOpen ? '320px' : '85px', flex: 1, padding: '50px', transition: '0.4s ease' }}>
        <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'60px' }}>
            <div><h1 style={{ fontWeight: '900', color: '#000', margin: 0, fontSize:'38px', letterSpacing:'-1.5px' }}>Painel Financeiro</h1><div style={{ width: '80px', height: '4px', background: '#000', marginTop: '12px' }}></div></div>
            
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNovoMenu(!showNovoMenu)} style={{ background:'#0f172a', color:'#fff', border:'none', padding:'20px 40px', borderRadius:'15px', fontWeight:'900', cursor:'pointer', fontSize:'16px' }}>Novo Chamado</button>
              {showNovoMenu && (
                <div onMouseLeave={() => setShowNovoMenu(false)} style={{ position:'absolute', top:'85px', right: 0, background:'#fff', borderRadius:'25px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', zIndex:2000, width:'320px', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                  <div onClick={() => router.push('/novo-chamado-nf')} style={dropItemStyle}>Chamado Boleto</div>
                  <div onClick={() => router.push('/novo-pagar-receber')} style={dropItemStyle}>Chamado Pagar/Receber</div>
                  <div onClick={() => router.push('/novo-chamado-rh')} style={{ ...dropItemStyle, borderBottom:'none', color:'#2563eb' }}>Chamado RH</div>
                </div>
              )}
            </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #cbd5e1', borderRadius: '35px', background: 'rgba(255,255,255,0.4)', overflow:'hidden' }}>
           
           {/* COLUNA 1: FATURAMENTO */}
           <div style={{ padding: '40px', borderRight: '1px solid #cbd5e1' }}>
              <div style={{ textAlign: 'center', fontSize: '26px', color:'#000', fontWeight:'400', marginBottom:'40px' }}>FATURAMENTO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {listaBoletos.map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'boleto' })} className="task-card">
                    <div style={{ background: '#1e293b', padding: '25px', color: '#fff' }}><h4 style={{ margin: 0, fontSize: '24px', fontWeight:'400' }}>{t.nom_cliente?.toUpperCase()}</h4></div>
                    <div style={{ padding: '25px' }}>
                      <label style={{color:'#94a3b8', fontSize:'11px'}}>MÉTODO</label>
                      <p style={{fontSize:'18px', color:'#2563eb', fontWeight:'400', marginBottom:'15px'}}>{t.forma_pagamento?.toUpperCase()}</p>
                      <label style={{color:'#94a3b8', fontSize:'11px'}}>VALOR TOTAL</label>
                      <p style={{fontSize:'26px', color:'#000', fontWeight:'400'}}>R$ {t.valor_servico}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* COLUNA 2: CONTAS */}
           <div style={{ padding: '40px', borderRight: '1px solid #cbd5e1' }}>
              <div style={{ textAlign: 'center', fontSize: '26px', color:'#000', fontWeight:'400', marginBottom:'40px' }}>CONTAS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {listaPagar.map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'pagar' })} className="task-card" style={{borderLeft:'10px solid #ef4444'}}>
                    <div style={{padding:'25px'}}>
                      <h4 style={{fontSize:'22px', fontWeight:'400', color:'#000'}}>{t.fornecedor?.toUpperCase()}</h4>
                      <label style={{marginTop:'15px'}}>VALOR</label><p style={{fontSize:'24px'}}>R$ {t.valor}</p>
                    </div>
                  </div>
                ))}
                {listaReceber.map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'receber' })} className="task-card" style={{borderLeft:'10px solid #3b82f6'}}>
                    <div style={{padding:'25px'}}>
                      <h4 style={{fontSize:'22px', fontWeight:'400', color:'#000'}}>{t.cliente?.toUpperCase()}</h4>
                      <label style={{marginTop:'15px'}}>VALOR</label><p style={{fontSize:'24px'}}>R$ {t.valor}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* COLUNA 3: RH */}
           <div style={{ padding: '40px' }}>
              <div style={{ textAlign: 'center', fontSize: '26px', color:'#000', fontWeight:'400', marginBottom:'40px' }}>RH</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {listaRH.map(t => (
                  <div key={t.id} onClick={() => setTarefaSelecionada({ ...t, gTipo: 'rh' })} className="task-card">
                    <div style={{padding:'25px'}}>
                      <h4 style={{fontSize:'22px', fontWeight:'400', color:'#000'}}>{t.funcionario?.toUpperCase()}</h4>
                      <label style={{marginTop:'15px'}}>TÍTULO</label><p style={{fontSize:'18px'}}>{t.titulo}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </main>

      {/* MODAL GIGANTE COM DESTAQUE TOTAL */}
      {tarefaSelecionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '1600px', maxWidth: '98%', maxHeight: '95vh', borderRadius: '40px', display: 'flex', overflow:'hidden', boxShadow:'0 50px 100px rgba(0,0,0,0.3)' }}>
            <div style={{ flex: '1.2', padding: '70px', overflowY: 'auto' }}>
              <button onClick={() => setTarefaSelecionada(null)} className="btn-back"><ArrowLeft size={18}/> VOLTAR</button>
              
              <h2 style={{fontSize:'72px', color:'#000', fontWeight:'400', lineHeight:'1.1', margin:'20px 0 40px'}}>{tarefaSelecionada.nom_cliente || tarefaSelecionada.fornecedor || tarefaSelecionada.funcionario}</h2>
              <div style={{display:'flex', gap:'60px', marginBottom:'60px', alignItems:'flex-end'}}>
                 <div><label>MÉTODO DE PAGAMENTO</label><p style={{fontSize:'36px', color:'#2563eb', fontWeight:'400'}}>{tarefaSelecionada.forma_pagamento?.toUpperCase() || 'N/A'}</p></div>
                 <div><label>VALOR TOTAL</label><p style={{fontSize:'56px', color:'#000', fontWeight:'400'}}>R$ {tarefaSelecionada.valor_exibicao || tarefaSelecionada.valor || tarefaSelecionada.valor_servico}</p></div>
                 <div><label>VENCIMENTO</label><p style={{fontSize:'36px', color:'#ef4444', fontWeight:'400'}}>{formatarData(tarefaSelecionada.vencimento_boleto || tarefaSelecionada.data_vencimento)}</p></div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'25px', border:'1px solid #e2e8f0', padding:'35px', borderRadius:'30px', background:'#fcfcfc' }}>
                 <div><label>ID PROCESSO</label><p style={{fontSize:'20px'}}>#{tarefaSelecionada.id}</p></div>
                 <div><label>NF SERVIÇO</label><input style={inputStyle} defaultValue={tarefaSelecionada.num_nf_servico} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'Chamado_NF', 'num_nf_servico', e.target.value)} /></div>
                 <div><label>NF PEÇA</label><input style={inputStyle} defaultValue={tarefaSelecionada.num_nf_peca} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'Chamado_NF', 'num_nf_peca', e.target.value)} /></div>
                 <div><label>QTD PARCELAS</label><p style={{fontSize:'20px'}}>{tarefaSelecionada.qtd_parcelas || 1}x</p></div>
                 <div><label>RECOBRANÇAS</label><p style={{fontSize:'20px'}}>{tarefaSelecionada.recombrancas_qtd || 0} vezes</p></div>
                 <div><label>DIAS VENCIDO</label><p style={{fontSize:'20px', color:'#ef4444'}}>{tarefaSelecionada.dias_vencido || 0} dias</p></div>
                 <div style={{gridColumn:'span 3'}}><label>DATAS DAS PARCELAS</label><p style={{background:'#f1f5f9', padding:'15px', borderRadius:'15px', fontSize:'18px'}}>{tarefaSelecionada.datas_parcelas || 'N/A'}</p></div>
                 <div style={{gridColumn:'span 3'}}><label>OBSERVAÇÕES DO PROCESSO</label><textarea style={{...inputStyle, height:'120px'}} defaultValue={tarefaSelecionada.obs} onBlur={e => handleUpdateField(tarefaSelecionada.id, 'Chamado_NF', 'obs', e.target.value)} /></div>
              </div>

              {/* FASE GERAR BOLETO - AÇÕES EXCLUSIVAS */}
              {tarefaSelecionada.status === 'gerar_boleto' && (
                <div style={{ marginTop: '50px', padding: '40px', background: '#f0f9ff', borderRadius: '30px', border: '1px solid #bae6fd' }}>
                   <label style={{color:'#0369a1', fontSize:'14px'}}>ANEXAR BOLETO FINAL</label>
                   <div style={{display:'flex', gap:'20px', marginTop:'20px'}}>
                      <label style={{flex:1, background:'#fff', border:'2px dashed #3b82f6', borderRadius:'20px', padding:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                         <Upload size={32} color="#3b82f6" style={{marginRight:'15px'}}/>
                         <span style={{fontSize:'18px', color:'#1d4ed8'}}>{fileBoleto ? fileBoleto.name : 'CLIQUE PARA SELECIONAR O BOLETO'}</span>
                         <input type="file" hidden onChange={e => setFileBoleto(e.target.files[0])} />
                      </label>
                      <button onClick={() => handleGerarBoletoFinanceiro(tarefaSelecionada.id)} style={{background:'#0f172a', color:'#fff', border:'none', padding:'0 40px', borderRadius:'20px', fontWeight:'900', cursor:'pointer', fontSize:'16px'}}>Gerar Tarefa Pos vendas : Enviar Boleto</button>
                   </div>
                </div>
              )}

              {/* LÓGICA DE PIX */}
              {tarefaSelecionada.forma_pagamento?.toLowerCase() === 'pix' && tarefaSelecionada.status === 'validar_pix' && (
                <div style={{ marginTop: '50px', padding: '40px', background: '#f0fdf4', borderRadius: '30px', border: '1px solid #bbf7d0' }}>
                   <h3 style={{color:'#166534', marginBottom:'20px'}}>CONFIRMAÇÃO DE PIX</h3>
                   <div style={{display:'flex', gap:'20px'}}>
                      {tarefaSelecionada.comprovante_pagamento && (
                        <a href={tarefaSelecionada.comprovante_pagamento} target="_blank" style={{flex:1, background:'#fff', padding:'20px', borderRadius:'15px', border:'1px solid #bbf7d0', textAlign:'center', textDecoration:'none', color:'#166534', fontWeight:'900'}}>VER COMPROVANTE</a>
                      )}
                      <button onClick={() => handleUpdateField(tarefaSelecionada.id, 'Chamado_NF', 'status', 'pago')} style={{flex:1, background:'#166534', color:'#fff', border:'none', borderRadius:'15px', fontWeight:'900', cursor:'pointer'}}>Mover para Pago</button>
                   </div>
                </div>
              )}

              <div style={{marginTop:'40px'}}>
                <label style={{marginBottom:'20px'}}>ANEXOS DO PROCESSO (CLIQUE NO ÍCONE PARA TROCAR)</label>
                <div style={{display:'flex', gap:'15px', flexWrap:'wrap'}}>
                   <div className="btn-file-mod"><label className="cursor-pointer flex items-center gap-2"><RefreshCw size={16}/> NF SERV <input type="file" hidden onChange={e => handleUpdateFile(tarefaSelecionada.id, 'Chamado_NF', 'anexo_nf_servico', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_servico && <a href={tarefaSelecionada.anexo_nf_servico} target="_blank"><Eye size={16}/></a>}</div>
                   <div className="btn-file-mod"><label className="cursor-pointer flex items-center gap-2"><RefreshCw size={16}/> NF PEÇA <input type="file" hidden onChange={e => handleUpdateFile(tarefaSelecionada.id, 'Chamado_NF', 'anexo_nf_peca', e.target.files[0])} /></label>{tarefaSelecionada.anexo_nf_peca && <a href={tarefaSelecionada.anexo_nf_peca} target="_blank"><Eye size={16}/></a>}</div>
                </div>
              </div>
            </div>
            
            <div style={{ flex: '0.8', padding: '40px', background: '#f8fafc', borderLeft:'1px solid #e2e8f0' }}>
              <ChatChamado chamadoId={tarefaSelecionada?.id} userProfile={userProfile} />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .task-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 20px; cursor: pointer; transition: 0.3s ease; overflow: hidden; }
        .task-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .btn-back { background: #000; color: #fff; border: none; padding: 15px 35px; border-radius: 15px; cursor: pointer; font-weight: 900; display: flex; align-items: center; gap: 10px; }
        label { display: block; font-size: 11px; font-weight: 900; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        p { margin: 0; font-weight: 400; color: #000; }
        .btn-file-mod { padding: 15px 25px; background: #fff; border: 1px solid #cbd5e1; border-radius: 15px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; text-decoration: none; color: #000; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

const dropItemStyle = { padding:'20px 25px', cursor:'pointer', color:'#000', borderBottom:'1px solid #f1f5f9', fontSize:'15px', fontWeight:'400', transition:'0.2s' };
const inputStyle = { width: '100%', padding: '18px', border: '1px solid #cbd5e1', borderRadius: '15px', fontFamily: 'Montserrat', fontSize: '18px', outline: 'none', background: '#fff' };
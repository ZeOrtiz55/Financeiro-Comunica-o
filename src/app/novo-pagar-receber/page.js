'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'

export default function NovoPagarReceber() {
  const [tipo, setTipo] = useState('') 
  const [tipoNota, setTipoNota] = useState('') // 'servico', 'pecas', 'ambas'
  const [loading, setLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null) // NOVO ESTADO PARA O PERFIL
  
  const [fileNFServ, setFileNFServ] = useState(null)
  const [fileNFPeca, setFileNFPeca] = useState(null)
  const [fileBoleto, setFileBoleto] = useState(null)
  const [fileReq, setFileReq] = useState(null)

  const [formData, setFormData] = useState({ entidade: '', valor: '', vencimento: '', motivo: '' })
  const router = useRouter()

  const path = typeof window !== 'undefined' ? window.location.pathname : '/novo-pagar-receber';

  // CARREGANDO O PERFIL DO USUÁRIO PARA O MENU FUNCIONAR
  useEffect(() => {
    const carregarPerfil = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/login')

      const { data: prof } = await supabase
        .from('financeiro_usu')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      setUserProfile(prof)
    }
    carregarPerfil()
  }, [router])

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/login'); 
  }

  const upload = async (file, folder) => {
    if (!file) return null
    const path = `${folder}/${Date.now()}-${file.name}`
    await supabase.storage.from('anexos').upload(path, file)
    const { data } = supabase.storage.from('anexos').getPublicUrl(path)
    return data.publicUrl
  }

  const salvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tipo === 'pagar') {
        const nf = await upload(fileNFServ, 'pagar')
        const bol = await upload(fileBoleto, 'pagar')
        const req = await upload(fileReq, 'pagar')
        await supabase.from('finan_pagar').insert([{
          fornecedor: formData.entidade, valor: formData.valor, data_vencimento: formData.vencimento,
          motivo: formData.motivo, anexo_nf: nf, anexo_boleto: bol, anexo_requisicao: req,
          status: 'financeiro' 
        }])
      } else {
        const nfS = await upload(fileNFServ, 'receber')
        const nfP = await upload(fileNFPeca, 'receber')
        await supabase.from('finan_receber').insert([{
          cliente: formData.entidade, valor: formData.valor, data_vencimento: formData.vencimento,
          motivo: formData.motivo, tipo_nota: tipoNota, anexo_nf_servico: nfS, anexo_nf_peca: nfP,
          status: 'financeiro' 
        }])
      }
      alert("Sucesso!"); 
      // Redireciona para a raiz, onde o controlador decidirá a Home
      router.push('/')
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap" rel="stylesheet" />

      {/* MENU LATERAL MODULAR - AGORA COM userProfile PASSADO */}
      <MenuLateral 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        path={path} 
        router={router} 
        handleLogout={handleLogout} 
        userProfile={userProfile}
      />

      <main style={{ 
        flex: 1, 
        marginLeft: isSidebarOpen ? '320px' : '85px', 
        transition: '0.4s ease', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 20px' 
      }}>
        
        <div style={{ background:'#fff', padding:'40px', borderRadius:'35px', width:'100%', maxWidth:'550px', boxShadow:'0 20px 50px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h2 style={{textAlign:'center', color:'#0f172a', fontWeight:'900', marginBottom:'30px'}}>Novo Processo Financeiro</h2>
          
          <div style={{ display:'flex', gap:'15px', marginBottom:'30px' }}>
            <button onClick={()=>setTipo('pagar')} style={{ flex:1, padding:'15px', borderRadius:'12px', border: tipo === 'pagar' ? '2px solid #ef4444' : '1px solid #eee', background: tipo === 'pagar' ? '#fef2f2' : '#fff', fontWeight:'bold', cursor:'pointer', transition:'0.2s' }}>🔴 A PAGAR</button>
            <button onClick={()=>setTipo('receber')} style={{ flex:1, padding:'15px', borderRadius:'12px', border: tipo === 'receber' ? '2px solid #3b82f6' : '1px solid #eee', background: tipo === 'receber' ? '#eff6ff' : '#fff', fontWeight:'bold', cursor:'pointer', transition:'0.2s' }}>🔵 A RECEBER</button>
          </div>

          {tipo && (
            <form onSubmit={salvar} style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
              <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                <label style={{fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'1px'}}>{tipo === 'pagar' ? "FORNECEDOR" : "CLIENTE"}</label>
                <input placeholder={tipo === 'pagar' ? "Nome do Fornecedor" : "Nome do Cliente"} required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', outline:'none', fontFamily:'Montserrat'}} onChange={e=>setFormData({...formData, entidade: e.target.value})} />
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                <label style={{fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'1px'}}>VALOR TOTAL</label>
                <input type="number" step="0.01" placeholder="0,00" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', outline:'none', fontFamily:'Montserrat'}} onChange={e=>setFormData({...formData, valor: e.target.value})} />
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                <label style={{fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'1px'}}>DATA DE VENCIMENTO</label>
                <input type="date" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', outline:'none', fontFamily:'Montserrat'}} onChange={e=>setFormData({...formData, vencimento: e.target.value})} />
              </div>
              
              <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                <label style={{fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'1px'}}>MOTIVO / DESCRIÇÃO</label>
                <textarea placeholder="Explique melhor o motivo deste chamado..." required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', height:'100px', outline:'none', fontFamily:'Montserrat', resize:'none'}} onChange={e=>setFormData({...formData, motivo: e.target.value})} />
              </div>

              {tipo === 'receber' && (
                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                  <label style={{fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'1px'}}>TIPO DE NOTA</label>
                  <select required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', outline:'none', fontFamily:'Montserrat'}} onChange={e=>setTipoNota(e.target.value)}>
                    <option value="">QUAL NOTA VAI ANEXAR?</option>
                    <option value="servico">Nota de Serviço</option>
                    <option value="pecas">Nota de Peças</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>
              )}

              <div style={{ background:'#f9fafb', padding:'20px', borderRadius:'15px', border:'1px solid #e2e8f0' }}>
                {(tipo === 'pagar' || tipoNota === 'servico' || tipoNota === 'ambas') && (
                  <div style={{marginBottom:'15px'}}>
                    <label style={{fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'5px'}}>Nota de Serviço:</label>
                    <input type="file" required style={{fontSize:'12px'}} onChange={e=>setFileNFServ(e.target.files[0])} />
                  </div>
                )}
                {(tipoNota === 'pecas' || tipoNota === 'ambas') && (
                  <div style={{marginBottom:'15px'}}>
                    <label style={{fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'5px'}}>Nota de Peças:</label>
                    <input type="file" required style={{fontSize:'12px'}} onChange={e=>setFileNFPeca(e.target.files[0])} />
                  </div>
                )}
                {tipo === 'pagar' && (
                  <>
                    <div style={{marginBottom:'15px'}}>
                      <label style={{fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'5px'}}>Boleto:</label>
                      <input type="file" required style={{fontSize:'12px'}} onChange={e=>setFileBoleto(e.target.files[0])} />
                    </div>
                    <div>
                      <label style={{fontSize:'11px', fontWeight:'700', display:'block', marginBottom:'5px'}}>Requisição:</label>
                      <input type="file" required style={{fontSize:'12px'}} onChange={e=>setFileReq(e.target.files[0])} />
                    </div>
                  </>
                )}
              </div>

              <button disabled={loading} style={{ background: tipo === 'pagar' ? '#ef4444' : '#3b82f6', color:'#fff', border:'none', padding:'20px', borderRadius:'15px', fontWeight:'900', cursor:'pointer', fontSize:'15px', marginTop:'10px' }}>
                {loading ? "PROCESSANDO..." : "CRIAR NOVO PROCESSO"}
              </button>
              <button type="button" onClick={()=>router.push('/')} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>Cancelar e Voltar</button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
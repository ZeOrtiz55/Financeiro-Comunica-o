'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// IMPORTAÇÃO DO MENU MODULAR
import MenuLateral from '@/components/MenuLateral'
import { ArrowLeft, Send, User, Bookmark, FileText, Building, LayoutDashboard, ClipboardList, TrendingDown, TrendingUp, UserCheck, LogOut, Menu } from 'lucide-react'

export default function NovoChamadoRH() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null) // NOVO ESTADO PARA O PERFIL
  const [form, setForm] = useState({ funcionario: '', titulo: '', descricao: '', setor: '' })
  const [enviando, setEnviando] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) 
  const router = useRouter()

  const path = typeof window !== 'undefined' ? window.location.pathname : '/novo-chamado-rh';

  useEffect(() => {
    const carregarUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)

      // BUSCA O PERFIL PARA O MENU FUNCIONAR SEM DAR 404
      const { data: prof } = await supabase
        .from('financeiro_usu')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      setUserProfile(prof)
    }

    carregarUsuario()
  }, [router])

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    router.push('/login'); 
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)
    try {
      const { error } = await supabase.from('finan_rh').insert([{
        ...form,
        usuario_id: user.id,
        status: 'aberto'
      }])
      if (error) throw error
      alert("Chamado de RH criado com sucesso!")
      
      // O push('/') vai cair no seu app/page.js que redireciona corretamente
      router.push('/')
    } catch (err) {
      alert("Erro ao criar chamado: " + err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* MENU LATERAL CORRIGIDO: PASSANDO userProfile */}
      <MenuLateral 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        path={path} 
        router={router} 
        handleLogout={handleLogout} 
        userProfile={userProfile}
      />

      <div style={{ 
        flex: 1, 
        marginLeft: isSidebarOpen ? '320px' : '85px', 
        transition: '0.4s ease', 
        padding: '40px' 
      }}>
        
        <button onClick={() => router.push('/')} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', marginBottom: '40px' }}>
          <ArrowLeft size={18} /> VOLTAR AO PAINEL
        </button>

        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '50px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontWeight: '900', fontSize: '32px', color: '#0f172a', marginBottom: '10px' }}>Novo Chamado de RH</h1>
          <p style={{ color: '#64748b', marginBottom: '40px' }}>Preencha os dados abaixo para registrar a solicitação.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px' }}><User size={14}/> NOME DO FUNCIONÁRIO</label>
              <input required value={form.funcionario} onChange={e => setForm({...form, funcionario: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' }} placeholder="Ex: João Silva" />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px' }}><Bookmark size={14}/> TÍTULO DO CHAMADO</label>
              <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' }} placeholder="Ex: Solicitação de Férias" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px' }}><Building size={14}/> SETOR</label>
                <select required value={form.setor} onChange={e => setForm({...form, setor: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc' }}>
                  <option value="">Selecione o setor...</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Vendas">Vendas</option>
                  <option value="Pós-Vendas">Pós-Vendas</option>
                  <option value="Oficina">Oficina</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: '#94a3b8', marginBottom: '10px' }}><FileText size={14}/> DESCRIÇÃO DETALHADA</label>
              <textarea rows="5" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc', resize: 'none' }} placeholder="Descreva os detalhes da solicitação..." />
            </div>

            <button type="submit" disabled={enviando} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '20px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
              {enviando ? "CRIANDO..." : <><Send size={20}/> CRIAR CHAMADO RH</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
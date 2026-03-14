'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = 'http://localhost:3000/login'; return }
        const { data: prof } = await supabase
          .from('financeiro_usu')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUserProfile(prof)
      } catch (e) {
        console.error('Auth error:', e)
        window.location.href = 'http://localhost:3000/login'
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = 'http://localhost:3000/login'
  }

  return { userProfile, loading, handleLogout, router }
}

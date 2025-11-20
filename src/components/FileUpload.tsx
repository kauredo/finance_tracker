'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function FileUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    if (!user) return

    setUploading(true)
    setError(null)

    try {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Create record in statements table
      // Note: We need to get an account ID first. For now, we'll just log success.
      // In a real flow, we'd ask the user which account this statement belongs to.
      
      onUploadComplete()
      alert('Upload successful!')
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/30 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <div className="text-white">Uploading...</div>
          ) : (
            <>
              <p className="mb-2 text-sm text-white/80">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-white/60">PDF, CSV, or TXT</p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.csv,.txt"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}

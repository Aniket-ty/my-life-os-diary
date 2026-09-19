import { api } from '../lib/api'

export interface VoiceCommandResponse {
  intent: string
  confidence: number
  provider: string
  kind?: 'result' | 'action' | 'navigate' | 'clarification'
  resultText?: string
  previewText?: string
  speechText?: string
  serverCommandId?: string
  requiresConfirmation?: boolean
  confirmationReason?: string
  clarification?: any
  executed?: boolean
  executionMessage?: string
  route?: string
  params?: any
  data?: any
  navigation?: {
    route: string
    groupId?: string
  }
}

export interface VoiceConfirmResponse {
  executed?: boolean
  cancelled?: boolean
  message: string
}

export const voiceService = {
  sendCommand: (transcript: string, autoExecute = true) =>
    api.post<VoiceCommandResponse>('/voice/command', { transcript, autoExecute }),
  confirmAction: (serverCommandId: string, confirmed = true) =>
    api.post<VoiceConfirmResponse>('/voice/confirm', { serverCommandId, confirmed }),
  transcribeAudio: (audioBlob: Blob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'speech.webm')
    return api.upload<{ transcript: string }>('/voice/transcribe', form)
  },
  listenAndProcess: (audioBlob: Blob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'speech.webm')
    return api.upload<VoiceCommandResponse & { transcript: string }>('/voice/listen', form)
  },
}

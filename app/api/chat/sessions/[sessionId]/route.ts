import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// DELETE /api/chat/sessions/[sessionId] - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat session:', error)
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 })
  }
}

// PATCH /api/chat/sessions/[sessionId] - Update a chat session (e.g., rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating chat session:', error)
    return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 })
  }
}
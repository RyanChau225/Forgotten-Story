import { NextResponse } from 'next/server'
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract"

// Initialize AWS Textract client
const client = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64')

    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer
      }
    })

    const response = await client.send(command)
    
    // Extract text from blocks
    let extractedText = ''
    response.Blocks?.forEach(block => {
      if (block.BlockType === 'LINE' && block.Text) {
        extractedText += block.Text + '\n'
      }
    })

    if (!extractedText) {
      return NextResponse.json({ error: 'No text found in image' }, { status: 400 })
    }

    return NextResponse.json({ text: extractedText.trim() })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
} 
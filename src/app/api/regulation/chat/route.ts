import { NextRequest, NextResponse } from 'next/server';
import { RegulationChatService } from '@/lib/regulationChat';

// Initialize the chat service
const chatService = new RegulationChatService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, documentType } = body;

    // Validate input
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.length > 1000) {
      return NextResponse.json(
        { error: 'Question is too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
    }

    console.log(`📝 Processing regulation question: "${question.substring(0, 100)}..."`);

    // Process the query using the RAG service
    const response = await chatService.processQuery(question);

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error in regulation chat API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error. Please try again.',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'document-types') {
      // Get available document types for filtering
      const documentTypes = await chatService.getDocumentTypes();
      
      return NextResponse.json({
        success: true,
        data: documentTypes
      });
    }

    // Default GET response with API info
    return NextResponse.json({
      success: true,
      message: 'Regulation Chat API',
      endpoints: {
        'POST /': 'Send a question to get an AI response with citations',
        'GET /?action=document-types': 'Get available document types for filtering'
      },
      usage: {
        'POST body': {
          question: 'string (required, max 1000 chars)',
          documentType: 'string (optional, filter by document type)'
        }
      }
    });

  } catch (error) {
    console.error('Error in regulation chat API GET:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
} 
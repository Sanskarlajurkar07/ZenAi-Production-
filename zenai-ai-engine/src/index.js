// src/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'zenai-ai-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mock AI Orchestrator (since real one isn't connected yet)
class MockOrchestrator {
  async initialize() {
    logger.info('Mock Orchestrator initialized');
    return true;
  }

  async processRequest(message, context = {}) {
    logger.info(`Processing request: ${message.substring(0, 50)}...`);
    
    // Mock response based on context type
    if (context.type === 'task-analysis') {
      return {
        response: `Task analysis for: "${message}"`,
        analysis: {
          complexityScore: 5,
          estimatedHours: 8,
          skillsRequired: ['JavaScript', 'Node.js'],
          recommendations: ['Break down into smaller tasks', 'Add unit tests']
        }
      };
    }

    if (context.type === 'task-creation') {
      return {
        response: 'Task created successfully',
        task: {
          title: message.substring(0, 50),
          description: message,
          priority: 'medium',
          estimatedTime: 8,
          tags: ['ai-generated']
        }
      };
    }

    if (context.type === 'project-analysis') {
      return {
        response: 'Project analysis completed',
        health: {
          score: 75,
          status: 'healthy',
          insights: ['Project on track', 'Good velocity'],
          recommendations: ['Continue current pace']
        }
      };
    }

    // Default response
    return {
      response: `I received your message: "${message}". AI engine is running in mock mode. Connect OpenAI for full functionality.`,
      metadata: {
        timestamp: new Date().toISOString(),
        mode: 'mock'
      }
    };
  }
}

// Initialize orchestrator
let orchestrator;

async function initializeOrchestrator() {
  try {
    orchestrator = new MockOrchestrator();
    await orchestrator.initialize();
    logger.info('✓ AI Orchestrator initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize orchestrator:', error);
    // Continue without AI features
  }
}

// AI Routes
app.post('/api/v1/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        error: 'Message is required' 
      });
    }

    if (!orchestrator) {
      return res.status(503).json({ 
        success: false,
        error: 'AI service not initialized' 
      });
    }

    const response = await orchestrator.processRequest(message, context);
    
    res.json({ 
      success: true,
      data: response 
    });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.post('/api/v1/ai/analyze-task', async (req, res) => {
  try {
    const { task, projectContext } = req.body;
    
    if (!task) {
      return res.status(400).json({ 
        success: false,
        error: 'Task data is required' 
      });
    }

    if (!orchestrator) {
      return res.status(503).json({ 
        success: false,
        error: 'AI service not initialized' 
      });
    }

    const analysis = await orchestrator.processRequest(
      `Analyze this task: ${JSON.stringify(task)}`,
      { type: 'task-analysis', ...projectContext }
    );
    
    res.json({ 
      success: true,
      data: analysis 
    });
  } catch (error) {
    logger.error('Task analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.post('/api/v1/ai/create-task', async (req, res) => {
  try {
    const { description, projectId } = req.body;
    
    if (!description) {
      return res.status(400).json({ 
        success: false,
        error: 'Task description is required' 
      });
    }

    if (!orchestrator) {
      return res.status(503).json({ 
        success: false,
        error: 'AI service not initialized' 
      });
    }

    const result = await orchestrator.processRequest(
      description,
      { type: 'task-creation', projectId }
    );
    
    res.json({ 
      success: true,
      data: result 
    });
  } catch (error) {
    logger.error('Task creation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.post('/api/v1/ai/analyze-project', async (req, res) => {
  try {
    const { projectData, tasks } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ 
        success: false,
        error: 'Project data is required' 
      });
    }

    if (!orchestrator) {
      return res.status(503).json({ 
        success: false,
        error: 'AI service not initialized' 
      });
    }

    const analysis = await orchestrator.processRequest(
      `Analyze project: ${JSON.stringify({ projectData, tasks })}`,
      { type: 'project-analysis' }
    );
    
    res.json({ 
      success: true,
      data: analysis 
    });
  } catch (error) {
    logger.error('Project analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeOrchestrator();
    
    app.listen(PORT, () => {
      logger.info(`🤖 ZenAI AI Engine running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Mode: Mock (connect OpenAI API for full functionality)`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
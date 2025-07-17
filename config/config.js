module.exports = {
    
    logger: {
        debug: false,           
        fileLogging: true,      
        maxLogFiles: 30,        
        logLevel: 'info'        
    },
   
    application: {
        maxFieldLength: 1024, 
        maxEmbedFields: 25,    
        stepTimeout: 300000,   
        maxApplicationsPerUser: 1 
    },
    
    colors: {
        success: '#00ff00',
        error: '#ff0000',
        info: '#0099ff',
        warning: '#ffaa00'
    }
};
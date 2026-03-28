// ========================================================================
// Example Usage Documentation
// ========================================================================

/*
EXAMPLE 1: Text Generation with LSTM
-------------------------------------
const textGen = NetworkTemplates.textGenerator(5000, 128, 256, {
    useGPU: true,
    dropout: 0.3
});

// Build vocabulary from training texts
const trainingTexts = ['Hello world', 'Machine learning is amazing', ...];
textGen.buildVocabulary(trainingTexts);

// Train on text data
const history = await textGen.trainOnTextBatch(trainingTexts, targetVectors, {
    epochs: 50,
    verbose: true
});

// Generate new text
const generated = textGen.generateText('Hello', 100, 0.8);
console.log(generated);

EXAMPLE 2: Image Classification with GPU
----------------------------------------
const imgClassifier = NetworkTemplates.imageClassifier(28, 10, {
    useGPU: true,
    gpuBackend: 'webgpu'
});

// Train on images
const images = [...]; // Array of flattened 28x28 images
const labels = [...]; // One-hot encoded labels

const history = await imgClassifier.trainOnImageBatch(images, labels, {
    epochs: 50,
    augment: true,
    verbose: true
});

// Make predictions
const prediction = imgClassifier.predict(testImage);

EXAMPLE 3: Audio Classification
--------------------------------
const audioClassifier = NetworkTemplates.audioClassifier(13, 100, 10);

// Process audio files
const audioBuffers = [...]; // Raw audio data
const labels = [...]; // One-hot labels

const history = await audioClassifier.trainOnAudioBatch(audioBuffers, labels, {
    epochs: 30,
    numMFCCs: 13,
    verbose: true
});

// Classify new audio
const mfccs = audioClassifier.extractMFCC(newAudioBuffer);
audioClassifier.resetRecurrentStates();
for (let frame of mfccs) {
    var output = audioClassifier.predict(frame);
}
console.log('Prediction:', output);

EXAMPLE 4: Transfer Learning
-----------------------------
// Load pre-trained model
const pretrained = new NeuralNetwork(784, [256, 128], 10);
pretrained.load(pretrainedModelData);

// Freeze early layers
pretrained.freezeLayers([0, 1]);

// Replace output layer for new task
pretrained.replaceOutputLayer(5, 'sigmoid');

// Fine-tune on new data
const history = pretrained.trainBatch(newData, newLabels);

EXAMPLE 5: Ensemble Learning
-----------------------------
const baseModel = new NeuralNetwork(100, [64, 32], 10);
const ensemble = baseModel.createEnsemble(5);

// Train ensemble
const histories = baseModel.trainEnsemble(trainData, trainLabels, {
    epochs: 50,
    verbose: true
});

// Make ensemble predictions
const prediction = baseModel.predictEnsemble(testInput, 'average');

EXAMPLE 6: Sequence-to-Sequence (Translation)
----------------------------------------------
const seq2seq = NetworkTemplates.sequenceToSequence(10000, 8000, 128);

// Train on parallel corpus
const sourceTexts = ['Hello', 'Good morning', ...];
const targetTexts = ['Hola', 'Buenos días', ...];

const history = seq2seq.trainSeq2Seq(sourceTexts, targetTexts, {
    epochs: 100,
    verbose: true
});

// Translate new text
const translation = seq2seq.translateSequence('Hello world');

EXAMPLE 7: GAN Image Generation
--------------------------------
const generator = NetworkTemplates.imageGenerator(100, 28);

// Train generator
const realImages = [...]; // Real training images

const history = generator.trainGAN(realImages, {
    epochs: 200,
    batchSize: 64,
    latentSize: 100,
    verbose: true
});

// Generate new images
const latent = generator.sampleLatentVector(100);
const generatedImage = generator.generateImage(latent);

EXAMPLE 8: Curriculum Learning
-------------------------------
const model = new NeuralNetwork(100, [128, 64], 10);

// Prepare easy and hard examples
const easyData = { inputs: [...], targets: [...] };
const hardData = { inputs: [...], targets: [...] };

const history = model.trainWithCurriculumLearning(easyData, hardData, {
    easyEpochs: 20,
    hardEpochs: 30,
    verbose: true
});

EXAMPLE 9: Attention Mechanism
-------------------------------
const model = new NeuralNetwork(128, [256], 128);
const attentionLayer = model.createAttentionLayer(256, 8);

// Use attention in forward pass
const query = [...]; // Query vector
const keys = [...];   // Key vectors
const values = [...]; // Value vectors

const attended = model.multiHeadAttention(attentionLayer, query, keys, values);

EXAMPLE 10: Convolutional Processing
-------------------------------------
// Create conv layer
const convLayer = model.createConvLayer(3, 32, 3, 1, 1);

// Apply convolution
const image = [...]; // 2D image array
const feature = model.convolve2D(image, convLayer.filters[0][0]);

// Apply pooling
const pooled = model.maxPool2D(feature, 2, 2);

EXAMPLE 11: Diagnostic Analysis
--------------------------------
// Check for gradient problems
const gradAnalysis = model.analyzeGradients();
console.log('Vanishing gradients:', gradAnalysis.vanishing);
console.log('Exploding gradients:', gradAnalysis.exploding);

// Get activation statistics
const actStats = model.getActivationStatistics();
console.log('Activation stats:', actStats);

// Visualize weights
model.visualizeWeightDistribution('weightCanvas');

// Plot learning curve
model.plotLearningCurve(history, 'learningCanvas');

// Calculate metrics
const predictions = testData.map(x => model.predict(x));
const metrics = model.calculateMetrics(predictions, testLabels);
console.log('Metrics:', metrics);

EXAMPLE 12: Advanced Training Techniques
-----------------------------------------
// Mixup augmentation
const history1 = model.trainWithMixup(inputs, targets, {
    alpha: 0.2,
    epochs: 50,
    verbose: true
});

// Label smoothing
const history2 = model.trainWithLabelSmoothing(inputs, targets, {
    smoothing: 0.1,
    epochs: 50,
    verbose: true
});

EXAMPLE 13: Feature Extraction
-------------------------------
// Extract features from pre-trained model
const features = model.extractFeatures(input);

// Use features for new task
const newModel = new NeuralNetwork(features.length, [32], 5);
newModel.train(features, newLabel);

EXAMPLE 14: GPU-Accelerated Training
-------------------------------------
const gpuModel = new NeuralNetwork(784, [512, 256], 10, {
    useGPU: true,
    gpuBackend: 'webgpu',
    optimizer: 'adam',
    learningRate: 0.001
});

// Parallel training with workers and GPU
const history = await gpuModel.trainTurboParallel(trainData, trainLabels, {
    epochs: 100,
    validationSplit: 0.2,
    patience: 10,
    verbose: true
});

EXAMPLE 15: Complete NLP Pipeline
----------------------------------
// Create model
const nlpModel = NetworkTemplates.textGenerator(5000, 128, 256);

// Build vocabulary
const corpus = ['Text 1', 'Text 2', ...];
nlpModel.buildVocabulary(corpus);

// Convert text to indices
const indices = nlpModel.textToIndices('Hello world');

// Get embeddings
const embeddings = nlpModel.embed(indices);

// Train
const targets = corpus.map(text => nlpModel.textToIndices(text));
nlpModel.trainOnTextBatch(corpus, targets, { epochs: 50 });

// Generate
const newText = nlpModel.generateText('Once upon a time', 100, 0.8);

*/

class NeuralNetwork {
    constructor(inputSize, hiddenSizes, outputSize, options = {}) {
        this.layers = [];
        this.experienceBuffer = [];
        this.learningRate = options.learningRate || 0.01;
        this.activation = options.activation || 'relu';
        this.outputActivation = options.outputActivation || 'sigmoid';
        this.bufferSize = options.bufferSize || 10000;
        this.batchSize = options.batchSize || 32;
        this.gamma = options.gamma || 0.95;
        this.epsilon = options.epsilon || 0.1;

        // Advanced optimization options
        this.optimizer = options.optimizer || 'sgd';
        this.momentum = options.momentum || 0.9;
        this.beta1 = options.beta1 || 0.9;
        this.beta2 = options.beta2 || 0.999;
        this.adamEpsilon = 1e-8;
        this.timeStep = 0;

        // Regularization
        this.dropout = options.dropout || 0;
        this.l2Lambda = options.l2Lambda || 0;
        this.training = true;

        // Memory management
        this.maxMemoryMB = options.maxMemoryMB || 100;
        this.autoCleanup = options.autoCleanup !== false;

        // Web Workers configuration
        this.useWorkers = options.useWorkers || false;
        this.numWorkers = options.numWorkers || navigator.hardwareConcurrency || 4;
        this.workers = [];
        this.workerBusy = [];



        // GPU Configuration
        this.useGPU = options.useGPU || false;
        this.gpuBackend = options.gpuBackend || 'webgl'; // 'webgl' or 'webgpu'
        this.gpuContext = null;
        this.gpuPrograms = {};

        // Recurrent Layer Configuration
        this.layerTypes = options.layerTypes || Array(hiddenSizes.length).fill('dense');

        // NLP Configuration
        this.vocabulary = options.vocabulary || {};
        this.embeddings = options.embeddings || null;
        this.embeddingSize = options.embeddingSize || 128;
        this.maxSequenceLength = options.maxSequenceLength || 100;

        // Attention Configuration
        this.attentionHeads = options.attentionHeads || 4;
        this.attentionLayers = [];

        // Build network architecture
        const sizes = [inputSize, ...hiddenSizes, outputSize];
        for (let i = 0; i < sizes.length - 1; i++) {
            const isOutputLayer = (i === sizes.length - 2);
            const layer = {
                weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                biases: this.randomArray(sizes[i + 1]),
                activations: [],
                inputs: [],
                activationType: isOutputLayer ? this.outputActivation : this.activation,
                layerType: this.layerTypes[i] || 'dense', // NEW
                velocityW: this.createZeroMatrix(sizes[i + 1], sizes[i]),
                velocityB: Array(sizes[i + 1]).fill(0),
                mW: this.createZeroMatrix(sizes[i + 1], sizes[i]),
                mB: Array(sizes[i + 1]).fill(0),
                vW: this.createZeroMatrix(sizes[i + 1], sizes[i]),
                vB: Array(sizes[i + 1]).fill(0),
                dropoutMask: []
            };

            // ADD RECURRENT LAYER INITIALIZATION
            if (layer.layerType === 'lstm') {
                layer.forgetGate = {
                    weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                    biases: this.randomArray(sizes[i + 1])
                };
                layer.inputGate = {
                    weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                    biases: this.randomArray(sizes[i + 1])
                };
                layer.outputGate = {
                    weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                    biases: this.randomArray(sizes[i + 1])
                };
                layer.cellState = Array(sizes[i + 1]).fill(0);
                layer.hiddenState = Array(sizes[i + 1]).fill(0);
            } else if (layer.layerType === 'gru') {
                layer.updateGate = {
                    weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                    biases: this.randomArray(sizes[i + 1])
                };
                layer.resetGate = {
                    weights: this.initializeWeights(sizes[i + 1], sizes[i]),
                    biases: this.randomArray(sizes[i + 1])
                };
                layer.hiddenState = Array(sizes[i + 1]).fill(0);
            }

            this.layers.push(layer);
        }

        // Initialize workers if enabled
        if (this.useWorkers && typeof Worker !== 'undefined') {
            this.initializeWorkers();
        }

        // Initialize GPU if enabled
        if (this.useGPU && typeof Worker !== 'undefined') {
            this.initializeGPU();
        }
    }

    // ========================================================================
    // Web Workers Initialization
    // ========================================================================

    initializeWorkers() {
        const workerCode = `
            // Worker code for neural network training
            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                if (type === 'train_batch') {
                    const results = trainBatchWorker(data);
                    self.postMessage({ type: 'train_complete', results });
                } else if (type === 'predict_batch') {
                    const results = predictBatchWorker(data);
                    self.postMessage({ type: 'predict_complete', results });
                }
            };
            
            function trainBatchWorker(data) {
                const { inputs, targets, weights, biases, config } = data;
                const results = [];
                
                for (let i = 0; i < inputs.length; i++) {
                    const gradients = computeGradients(
                        inputs[i], 
                        targets[i], 
                        weights, 
                        biases, 
                        config
                    );
                    results.push(gradients);
                }
                
                return results;
            }
            
            function predictBatchWorker(data) {
                const { inputs, weights, biases, config } = data;
                const results = [];
                
                for (let i = 0; i < inputs.length; i++) {
                    const output = forward(inputs[i], weights, biases, config);
                    results.push(output);
                }
                
                return results;
            }
            
            function activate(x, type) {
                switch(type) {
                    case 'sigmoid':
                        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
                    case 'tanh':
                        return Math.tanh(x);
                    case 'relu':
                        return Math.max(0, x);
                    case 'leaky_relu':
                        return x > 0 ? x : 0.01 * x;
                    case 'linear':
                        return x;
                    default:
                        return Math.max(0, x);
                }
            }
            
            function activateDerivative(preActivation, activation, type) {
                switch(type) {
                    case 'sigmoid':
                        return activation * (1 - activation);
                    case 'tanh':
                        return 1 - activation * activation;
                    case 'relu':
                        return preActivation > 0 ? 1 : 0;
                    case 'leaky_relu':
                        return preActivation > 0 ? 1 : 0.01;
                    case 'linear':
                        return 1;
                    default:
                        return preActivation > 0 ? 1 : 0;
                }
            }
            
            function forward(input, weights, biases, config) {
                let current = input;
                const layerOutputs = [];
                const preActivations = [];
                
                for (let i = 0; i < weights.length; i++) {
                    const output = [];
                    const preAct = [];
                    const activationType = i === weights.length - 1 ? 
                        config.outputActivation : config.activation;
                    
                    for (let j = 0; j < weights[i].length; j++) {
                        let sum = biases[i][j];
                        for (let k = 0; k < current.length; k++) {
                            sum += current[k] * weights[i][j][k];
                        }
                        preAct.push(sum);
                        output.push(activate(sum, activationType));
                    }
                    
                    layerOutputs.push(output);
                    preActivations.push(preAct);
                    current = output;
                }
                
                return { outputs: layerOutputs, preActivations };
            }
            
            function computeGradients(input, target, weights, biases, config) {
                const { outputs, preActivations } = forward(input, weights, biases, config);
                const gradients = [];
                
                // Calculate output layer gradients
                const lastLayer = outputs.length - 1;
                const outputGrads = [];
                for (let i = 0; i < outputs[lastLayer].length; i++) {
                    const error = target[i] - outputs[lastLayer][i];
                    const activationType = config.outputActivation;
                    const grad = error * activateDerivative(
                        preActivations[lastLayer][i],
                        outputs[lastLayer][i],
                        activationType
                    );
                    outputGrads.push(grad);
                }
                
                gradients.push(outputGrads);
                
                // Backpropagate through hidden layers
                let errors = outputGrads;
                for (let i = lastLayer - 1; i >= 0; i--) {
                    const layerGrads = [];
                    const newErrors = [];
                    
                    for (let j = 0; j < outputs[i].length; j++) {
                        let error = 0;
                        for (let k = 0; k < weights[i + 1].length; k++) {
                            error += weights[i + 1][k][j] * errors[k];
                        }
                        
                        const activationType = config.activation;
                        const grad = error * activateDerivative(
                            preActivations[i][j],
                            outputs[i][j],
                            activationType
                        );
                        layerGrads.push(grad);
                        newErrors.push(error);
                    }
                    
                    gradients.unshift(layerGrads);
                    errors = layerGrads;
                }
                
                return { gradients, outputs };
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        for (let i = 0; i < this.numWorkers; i++) {
            this.workers.push(new Worker(workerUrl));
            this.workerBusy.push(false);
        }
    }

    terminateWorkers() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        this.workerBusy = [];
    }

    // ========================================================================
    // Parallel Training Methods
    // ========================================================================

    async trainBatchParallel(batchInputs, batchTargets) {
        if (!this.useWorkers || this.workers.length === 0) {
            return this.trainBatch(batchInputs, batchTargets);
        }

        const batchesPerWorker = Math.ceil(batchInputs.length / this.numWorkers);
        const promises = [];

        for (let i = 0; i < this.numWorkers; i++) {
            const start = i * batchesPerWorker;
            const end = Math.min(start + batchesPerWorker, batchInputs.length);

            if (start >= batchInputs.length) break;

            const workerBatch = batchInputs.slice(start, end);
            const workerTargets = batchTargets.slice(start, end);

            promises.push(this.trainWorkerBatch(i, workerBatch, workerTargets));
        }

        const results = await Promise.all(promises);

        // Aggregate gradients and update weights
        let totalLoss = 0;
        for (const result of results) {
            totalLoss += result.loss;
            this.applyGradients(result.gradients);
        }

        return totalLoss / batchInputs.length;
    }

    trainWorkerBatch(workerIndex, inputs, targets) {
        return new Promise((resolve) => {
            const worker = this.workers[workerIndex];
            this.workerBusy[workerIndex] = true;

            const config = {
                activation: this.activation,
                outputActivation: this.outputActivation,
                learningRate: this.learningRate
            };

            const weights = this.layers.map(l => l.weights);
            const biases = this.layers.map(l => l.biases);

            worker.onmessage = (e) => {
                if (e.data.type === 'train_complete') {
                    this.workerBusy[workerIndex] = false;

                    const gradients = e.data.results;
                    let loss = 0;

                    for (let i = 0; i < gradients.length; i++) {
                        const outputs = gradients[i].outputs;
                        const lastOutput = outputs[outputs.length - 1];
                        for (let j = 0; j < lastOutput.length; j++) {
                            loss += Math.pow(targets[i][j] - lastOutput[j], 2);
                        }
                    }

                    resolve({ gradients, loss: loss / inputs.length });
                }
            };

            worker.postMessage({
                type: 'train_batch',
                data: { inputs, targets, weights, biases, config }
            });
        });
    }

    applyGradients(gradientBatch) {
        // Average and apply gradients from workers
        for (const item of gradientBatch) {
            const { gradients } = item;

            for (let i = 0; i < gradients.length; i++) {
                const layer = this.layers[i];
                const layerGrads = gradients[i];

                for (let j = 0; j < layerGrads.length; j++) {
                    layer.biases[j] += this.learningRate * layerGrads[j];

                    for (let k = 0; k < layer.weights[j].length; k++) {
                        const gradient = layerGrads[j] * layer.inputs[k];
                        layer.weights[j][k] += this.learningRate * gradient;
                    }
                }
            }
        }
    }

    async trainTurboParallel(batchInputs, batchTargets, options = {}) {
        const epochs = options.epochs || 100;
        const validationSplit = options.validationSplit || 0.1;
        const earlyStoppingPatience = options.patience || 10;
        const verbose = options.verbose || false;

        const splitIdx = Math.floor(batchInputs.length * (1 - validationSplit));
        const trainInputs = batchInputs.slice(0, splitIdx);
        const trainTargets = batchTargets.slice(0, splitIdx);
        const valInputs = batchInputs.slice(splitIdx);
        const valTargets = batchTargets.slice(splitIdx);

        let bestLoss = Infinity;
        let patience = 0;
        const history = { trainLoss: [], valLoss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            // Parallel training
            const trainLoss = await this.trainBatchParallel(trainInputs, trainTargets);

            // Validation
            this.training = false;
            let valLoss = 0;
            for (let i = 0; i < valInputs.length; i++) {
                const outputs = this.predict(valInputs[i]);
                valLoss += NeuralNetworkUtils.mse(outputs, valTargets[i]);
            }
            valLoss /= valInputs.length;
            this.training = true;

            history.trainLoss.push(trainLoss);
            history.valLoss.push(valLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Train Loss = ${trainLoss.toFixed(4)}, Val Loss = ${valLoss.toFixed(4)}`);
            }

            if (valLoss < bestLoss) {
                bestLoss = valLoss;
                patience = 0;
            } else {
                patience++;
                if (patience >= earlyStoppingPatience) {
                    if (verbose) console.log(`Early stopping at epoch ${epoch}`);
                    break;
                }
            }

            if (this.autoCleanup && epoch % 50 === 0) {
                this.cleanupMemory();
            }
        }

        return history;
    }

    // ========================================================================
    // Original Methods (keeping all existing functionality)
    // ========================================================================

    initializeWeights(rows, cols) {
        const isReLU = this.activation === 'relu' || this.activation === 'leaky_relu';
        const limit = isReLU ? Math.sqrt(2 / cols) : Math.sqrt(6 / (rows + cols));
        return Array(rows).fill(0).map(() =>
            Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * limit)
        );
    }

    randomArray(size) {
        return Array(size).fill(0).map(() => (Math.random() * 2 - 1) * 0.01);
    }

    createZeroMatrix(rows, cols) {
        return Array(rows).fill(0).map(() => Array(cols).fill(0));
    }

    activate(x, type) {
        switch (type) {
            case 'sigmoid':
                return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
            case 'tanh':
                return Math.tanh(x);
            case 'relu':
                return Math.max(0, x);
            case 'leaky_relu':
                return x > 0 ? x : 0.01 * x;
            case 'softplus':
                return Math.log(1 + Math.exp(Math.min(500, x)));
            case 'linear':
                return x;
            default:
                return Math.max(0, x);
        }
    }

    activateDerivative(preActivation, activation, type) {
        switch (type) {
            case 'sigmoid':
                return activation * (1 - activation);
            case 'tanh':
                return 1 - activation * activation;
            case 'relu':
                return preActivation > 0 ? 1 : 0;
            case 'leaky_relu':
                return preActivation > 0 ? 1 : 0.01;
            case 'softplus':
                return 1 / (1 + Math.exp(-preActivation));
            case 'linear':
                return 1;
            default:
                return preActivation > 0 ? 1 : 0;
        }
    }

    applyDropout(values, layer) {
        if (!this.training || this.dropout === 0) {
            return values;
        }

        layer.dropoutMask = values.map(() => Math.random() > this.dropout ? 1 : 0);
        return values.map((v, i) => v * layer.dropoutMask[i] / (1 - this.dropout));
    }

    predict(inputs, sequenceMode = false) {
        let current = inputs;

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            layer.inputs = current;

            let output;

            // Handle different layer types
            if (layer.layerType === 'lstm') {
                output = this.forwardLSTM(layer, current);
            } else if (layer.layerType === 'gru') {
                output = this.forwardGRU(layer, current);
            } else {
                // Original dense layer code
                output = [];
                const preActivations = [];
                for (let j = 0; j < layer.weights.length; j++) {
                    let sum = layer.biases[j];
                    for (let k = 0; k < current.length; k++) {
                        sum += current[k] * layer.weights[j][k];
                    }
                    preActivations.push(sum);
                    output.push(this.activate(sum, layer.activationType));
                }
                layer.preActivations = preActivations;
            }

            layer.activations = output;

            if (i < this.layers.length - 1) {
                current = this.applyDropout(output, layer);
            } else {
                current = output;
            }
        }

        return current;
    }

    train(inputs, targets) {
        this.training = true;
        const outputs = this.predict(inputs);
        let errors = targets.map((t, i) => t - outputs[i]);
    
        this.timeStep++;
    
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
    
            // Create gradients based on layer type
            let gradients;
            
            if (layer.layerType === 'lstm' || layer.layerType === 'gru') {
                // For recurrent layers, use simpler gradient calculation
                gradients = layer.activations.map((a, j) => errors[j]);
            } else {
                // For dense layers, use derivative with preActivations
                gradients = layer.activations.map((a, j) => {
                    const preAct = layer.preActivations ? layer.preActivations[j] : 0;
                    return errors[j] * this.activateDerivative(preAct, a, layer.activationType);
                });
            }
    
            this.updateWeights(layer, gradients, i);
    
            if (i > 0) {
                const prevLayer = this.layers[i - 1];
                const newErrors = Array(layer.inputs.length).fill(0);
                for (let k = 0; k < layer.inputs.length; k++) {
                    for (let j = 0; j < layer.weights.length; j++) {
                        newErrors[k] += layer.weights[j][k] * errors[j];
                    }
                    if (prevLayer.dropoutMask && prevLayer.dropoutMask.length > 0 && prevLayer.dropoutMask[k] === 0) {
                        newErrors[k] = 0;
                    }
                }
                errors = newErrors;
            }
        }
    
        return outputs;
    }

    updateWeights(layer, gradients, layerIndex) {
        switch (this.optimizer) {
            case 'momentum':
                this.updateMomentum(layer, gradients);
                break;
            case 'adam':
                this.updateAdam(layer, gradients);
                break;
            default:
                this.updateSGD(layer, gradients);
        }
    }

    updateSGD(layer, gradients) {
        for (let j = 0; j < layer.weights.length; j++) {
            for (let k = 0; k < layer.weights[j].length; k++) {
                const gradient = gradients[j] * layer.inputs[k];
                const l2Penalty = this.l2Lambda * layer.weights[j][k];
                layer.weights[j][k] += this.learningRate * (gradient - l2Penalty);
            }
            layer.biases[j] += this.learningRate * gradients[j];
        }
    }

    updateMomentum(layer, gradients) {
        for (let j = 0; j < layer.weights.length; j++) {
            for (let k = 0; k < layer.weights[j].length; k++) {
                const gradient = gradients[j] * layer.inputs[k];
                const l2Penalty = this.l2Lambda * layer.weights[j][k];
                layer.velocityW[j][k] = this.momentum * layer.velocityW[j][k] +
                    this.learningRate * (gradient - l2Penalty);
                layer.weights[j][k] += layer.velocityW[j][k];
            }
            layer.velocityB[j] = this.momentum * layer.velocityB[j] +
                this.learningRate * gradients[j];
            layer.biases[j] += layer.velocityB[j];
        }
    }

    updateAdam(layer, gradients) {
        const lr_t = this.learningRate * Math.sqrt(1 - Math.pow(this.beta2, this.timeStep)) /
            (1 - Math.pow(this.beta1, this.timeStep));

        for (let j = 0; j < layer.weights.length; j++) {
            for (let k = 0; k < layer.weights[j].length; k++) {
                const gradient = gradients[j] * layer.inputs[k];
                const l2Penalty = this.l2Lambda * layer.weights[j][k];
                const g = gradient - l2Penalty;

                layer.mW[j][k] = this.beta1 * layer.mW[j][k] + (1 - this.beta1) * g;
                layer.vW[j][k] = this.beta2 * layer.vW[j][k] + (1 - this.beta2) * g * g;

                layer.weights[j][k] += lr_t * layer.mW[j][k] /
                    (Math.sqrt(layer.vW[j][k]) + this.adamEpsilon);
            }

            const g_b = gradients[j];
            layer.mB[j] = this.beta1 * layer.mB[j] + (1 - this.beta1) * g_b;
            layer.vB[j] = this.beta2 * layer.vB[j] + (1 - this.beta2) * g_b * g_b;
            layer.biases[j] += lr_t * layer.mB[j] / (Math.sqrt(layer.vB[j]) + this.adamEpsilon);
        }
    }

    trainBatch(batchInputs, batchTargets) {
        let totalLoss = 0;
        for (let i = 0; i < batchInputs.length; i++) {
            const outputs = this.train(batchInputs[i], batchTargets[i]);
            totalLoss += NeuralNetworkUtils.mse(outputs, batchTargets[i]);
        }

        if (this.autoCleanup && batchInputs.length > 100) {
            this.cleanupMemory();
        }

        return totalLoss / batchInputs.length;
    }

    trainTurbo(batchInputs, batchTargets, options = {}) {
        const epochs = options.epochs || 100;
        const validationSplit = options.validationSplit || 0.1;
        const earlyStoppingPatience = options.patience || 10;
        const verbose = options.verbose || false;

        const splitIdx = Math.floor(batchInputs.length * (1 - validationSplit));
        const trainInputs = batchInputs.slice(0, splitIdx);
        const trainTargets = batchTargets.slice(0, splitIdx);
        const valInputs = batchInputs.slice(splitIdx);
        const valTargets = batchTargets.slice(splitIdx);

        let bestLoss = Infinity;
        let patience = 0;
        const history = { trainLoss: [], valLoss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let trainLoss = 0;
            for (let i = 0; i < trainInputs.length; i++) {
                const outputs = this.train(trainInputs[i], trainTargets[i]);
                trainLoss += NeuralNetworkUtils.mse(outputs, trainTargets[i]);
            }
            trainLoss /= trainInputs.length;

            this.training = false;
            let valLoss = 0;
            for (let i = 0; i < valInputs.length; i++) {
                const outputs = this.predict(valInputs[i]);
                valLoss += NeuralNetworkUtils.mse(outputs, valTargets[i]);
            }
            valLoss /= valInputs.length;
            this.training = true;

            history.trainLoss.push(trainLoss);
            history.valLoss.push(valLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Train Loss = ${trainLoss.toFixed(4)}, Val Loss = ${valLoss.toFixed(4)}`);
            }

            if (valLoss < bestLoss) {
                bestLoss = valLoss;
                patience = 0;
            } else {
                patience++;
                if (patience >= earlyStoppingPatience) {
                    if (verbose) console.log(`Early stopping at epoch ${epoch}`);
                    break;
                }
            }

            if (this.autoCleanup && epoch % 50 === 0) {
                this.cleanupMemory();
            }
        }

        return history;
    }

    // RL and other methods remain unchanged
    storeExperience(state, action, reward, nextState, done) {
        this.experienceBuffer.push({ state, action, reward, nextState, done });
        if (this.experienceBuffer.length > this.bufferSize) {
            this.experienceBuffer.shift();
        }
        if (this.autoCleanup) {
            this.checkMemoryUsage();
        }
    }

    trainRL(miniBatchSize = null) {
        const batchSize = miniBatchSize || this.batchSize;
        if (this.experienceBuffer.length < batchSize) return null;

        const batch = [];
        const indices = new Set();
        while (indices.size < batchSize) {
            indices.add(Math.floor(Math.random() * this.experienceBuffer.length));
        }
        indices.forEach(idx => batch.push(this.experienceBuffer[idx]));

        let totalLoss = 0;
        for (let exp of batch) {
            const { state, action, reward, nextState, done } = exp;
            const currentQ = this.predict(state);
            let target = reward;
            if (!done) {
                const nextQ = this.predict(nextState);
                target = reward + this.gamma * Math.max(...nextQ);
            }
            const targets = [...currentQ];
            targets[action] = target;
            this.train(state, targets);
            totalLoss += Math.pow(targets[action] - currentQ[action], 2);
        }
        return totalLoss / batchSize;
    }

    selectAction(state, explore = true) {
        if (explore && Math.random() < this.epsilon) {
            return Math.floor(Math.random() * this.layers[this.layers.length - 1].weights.length);
        }
        const qValues = this.predict(state);
        return qValues.indexOf(Math.max(...qValues));
    }

    decayEpsilon(decayRate = 0.995, minEpsilon = 0.01) {
        this.epsilon = Math.max(minEpsilon, this.epsilon * decayRate);
    }

    // ========================================================================
    // Network Visualization
    // ========================================================================

    drawNetwork(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Options
        const nodeRadius = options.nodeRadius || 8;
        const nodeColor = options.nodeColor || '#4CAF50';
        const activeNodeColor = options.activeNodeColor || '#FF5722';
        const lineColor = options.lineColor || '#90A4AE';
        const activeLineColor = options.activeLineColor || '#FFC107';
        const lineWidth = options.lineWidth || 1;
        const activeLineWidth = options.activeLineWidth || 2;
        const showLabels = options.showLabels !== false;
        const fontSize = options.fontSize || 10;
        const activationThreshold = options.activationThreshold || 0.3;
        const weightThreshold = options.weightThreshold || 0.1;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Calculate layer sizes including input
        const layerSizes = [
            this.layers[0].weights[0].length, // input size
            ...this.layers.map(l => l.weights.length)
        ];

        // Calculate positions for each node
        const positions = [];
        const padding = 60;
        const usableWidth = width - 2 * padding;
        const usableHeight = height - 2 * padding;
        const layerSpacing = usableWidth / (layerSizes.length - 1);

        for (let i = 0; i < layerSizes.length; i++) {
            const layerPositions = [];
            const nodeCount = layerSizes[i];
            const maxNodes = Math.max(...layerSizes);
            const nodeSpacing = usableHeight / (Math.max(nodeCount, maxNodes) + 1);
            const layerHeight = nodeCount * nodeSpacing;
            const startY = (height - layerHeight) / 2 + nodeSpacing / 2;

            for (let j = 0; j < nodeCount; j++) {
                layerPositions.push({
                    x: padding + i * layerSpacing,
                    y: startY + j * nodeSpacing
                });
            }
            positions.push(layerPositions);
        }

        // Get activation values if available
        const activations = [];
        if (this.layers[0].inputs && this.layers[0].inputs.length > 0) {
            activations.push(this.layers[0].inputs);
            this.layers.forEach(layer => {
                if (layer.activations && layer.activations.length > 0) {
                    activations.push(layer.activations);
                }
            });
        }

        // Draw connections first (so they appear behind nodes)
        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const fromPositions = positions[i];
            const toPositions = positions[i + 1];

            for (let j = 0; j < layer.weights.length; j++) {
                for (let k = 0; k < layer.weights[j].length; k++) {
                    const weight = layer.weights[j][k];
                    const from = fromPositions[k];
                    const to = toPositions[j];

                    // Determine if connection is active
                    const isActive = activations.length > 0 &&
                        Math.abs(activations[i][k]) > activationThreshold &&
                        Math.abs(weight) > weightThreshold;

                    // Draw line
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);

                    // Color based on weight strength and activation
                    if (isActive) {
                        const intensity = Math.min(1, Math.abs(activations[i][k]));
                        ctx.strokeStyle = activeLineColor;
                        ctx.lineWidth = activeLineWidth;
                        ctx.globalAlpha = 0.3 + intensity * 0.7;
                    } else {
                        const weightStrength = Math.min(1, Math.abs(weight));
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = lineWidth;
                        ctx.globalAlpha = 0.1 + weightStrength * 0.2;
                    }

                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }

        // Draw nodes
        for (let i = 0; i < positions.length; i++) {
            const layerPositions = positions[i];

            for (let j = 0; j < layerPositions.length; j++) {
                const pos = layerPositions[j];

                // Determine if node is active
                const activation = activations.length > i ? activations[i][j] : 0;
                const isActive = Math.abs(activation) > activationThreshold;

                // Draw node circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);

                if (isActive) {
                    const intensity = Math.min(1, Math.abs(activation));
                    ctx.fillStyle = activeNodeColor;
                    ctx.globalAlpha = 0.5 + intensity * 0.5;
                } else {
                    ctx.fillStyle = nodeColor;
                    ctx.globalAlpha = 0.6;
                }

                ctx.fill();
                ctx.globalAlpha = 1;

                // Draw node border
                ctx.strokeStyle = isActive ? activeNodeColor : '#37474F';
                ctx.lineWidth = isActive ? 2 : 1;
                ctx.stroke();
            }
        }

        // Draw layer labels
        if (showLabels) {
            ctx.fillStyle = '#263238';
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';

            const labels = ['Input', ...Array(this.layers.length - 1).fill('Hidden'), 'Output'];

            for (let i = 0; i < positions.length; i++) {
                const x = positions[i][0].x;
                const y = padding / 2;
                ctx.fillText(labels[i], x, y);

                // Draw node count
                ctx.font = `${fontSize - 2}px Arial`;
                ctx.fillStyle = '#546E7A';
                ctx.fillText(`(${layerSizes[i]})`, x, y + fontSize + 2);
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = '#263238';
            }
        }
    }

    // ========================================================================
    // GPU Acceleration Methods
    // ========================================================================

    initializeGPU() {
        try {
            if (this.gpuBackend === 'webgpu' && navigator.gpu) {
                this.initializeWebGPU();
            } else {
                this.initializeWebGL();
            }
            console.log(`GPU acceleration enabled (${this.gpuBackend})`);
        } catch (e) {
            console.warn('GPU initialization failed, falling back to CPU:', e);
            this.useGPU = false;
        }
    }

    initializeWebGL() {
        const canvas = document.createElement('canvas');
        this.gpuContext = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!this.gpuContext) {
            throw new Error('WebGL not supported');
        }

        console.log('WebGL context initialized');
    }

    async initializeWebGPU() {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }

        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();

        this.gpuContext = {
            device,
            adapter,
            queue: device.queue
        };

        // Create compute pipeline for matrix multiplication
        this.gpuPrograms.matMul = await this.createWebGPUMatMulPipeline(device);

        console.log('WebGPU initialized');
    }

    async createWebGPUMatMulPipeline(device) {
        const shaderCode = `
            @group(0) @binding(0) var<storage, read> matrixA: array<f32>;
            @group(0) @binding(1) var<storage, read> matrixB: array<f32>;
            @group(0) @binding(2) var<storage, read_write> result: array<f32>;
            @group(0) @binding(3) var<uniform> dims: vec3<u32>;
            
            @compute @workgroup_size(8, 8)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let row = global_id.x;
                let col = global_id.y;
                let M = dims.x;
                let N = dims.y;
                let K = dims.z;
                
                if (row >= M || col >= N) {
                    return;
                }
                
                var sum = 0.0;
                for (var i = 0u; i < K; i = i + 1u) {
                    sum += matrixA[row * K + i] * matrixB[i * N + col];
                }
                
                result[row * N + col] = sum;
            }
        `;

        const shaderModule = device.createShaderModule({ code: shaderCode });

        return device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'main'
            }
        });
    }

    async gpuMatMul(matrixA, matrixB) {
        if (!this.useGPU || !this.gpuContext) {
            return this.cpuMatMul(matrixA, matrixB);
        }

        if (this.gpuBackend === 'webgpu') {
            return this.webGPUMatMul(matrixA, matrixB);
        } else {
            return this.webGLMatMul(matrixA, matrixB);
        }
    }

    async webGPUMatMul(matrixA, matrixB) {
        const device = this.gpuContext.device;
        const M = matrixA.length;
        const K = matrixA[0].length;
        const N = matrixB[0].length;

        // Flatten matrices
        const flatA = new Float32Array(matrixA.flat());
        const flatB = new Float32Array(matrixB.flat());

        // Create buffers
        const bufferA = device.createBuffer({
            size: flatA.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(bufferA.getMappedRange()).set(flatA);
        bufferA.unmap();

        const bufferB = device.createBuffer({
            size: flatB.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(bufferB.getMappedRange()).set(flatB);
        bufferB.unmap();

        const resultSize = M * N * 4;
        const resultBuffer = device.createBuffer({
            size: resultSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        const dimsBuffer = device.createBuffer({
            size: 12,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint32Array(dimsBuffer.getMappedRange()).set([M, N, K]);
        dimsBuffer.unmap();

        // Create bind group
        const bindGroup = device.createBindGroup({
            layout: this.gpuPrograms.matMul.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: bufferA } },
                { binding: 1, resource: { buffer: bufferB } },
                { binding: 2, resource: { buffer: resultBuffer } },
                { binding: 3, resource: { buffer: dimsBuffer } }
            ]
        });

        // Execute
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.gpuPrograms.matMul);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(M / 8), Math.ceil(N / 8));
        passEncoder.end();

        // Read results
        const gpuReadBuffer = device.createBuffer({
            size: resultSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        commandEncoder.copyBufferToBuffer(resultBuffer, 0, gpuReadBuffer, 0, resultSize);
        device.queue.submit([commandEncoder.finish()]);

        await gpuReadBuffer.mapAsync(GPUMapMode.READ);
        const resultArray = new Float32Array(gpuReadBuffer.getMappedRange());

        // Reshape to 2D array
        const result = [];
        for (let i = 0; i < M; i++) {
            result.push(Array.from(resultArray.slice(i * N, (i + 1) * N)));
        }

        gpuReadBuffer.unmap();

        // Cleanup
        bufferA.destroy();
        bufferB.destroy();
        resultBuffer.destroy();
        dimsBuffer.destroy();
        gpuReadBuffer.destroy();

        return result;
    }

    webGLMatMul(matrixA, matrixB) {
        // Fallback to CPU for WebGL (full WebGL implementation is complex)
        console.warn('WebGL matmul not fully implemented, using CPU');
        return this.cpuMatMul(matrixA, matrixB);
    }

    cpuMatMul(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            const row = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < A[i].length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                row.push(sum);
            }
            result.push(row);
        }
        return result;
    }

    // ========================================================================
    // Recurrent Layer Methods (LSTM/GRU)
    // ========================================================================

    forwardLSTM(layer, inputs) {
        const output = [];
        const preActivations = []; 
        const newCellState = [];
    
        for (let j = 0; j < layer.weights.length; j++) {
            // Forget gate
            let forgetSum = layer.forgetGate.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                forgetSum += inputs[k] * layer.forgetGate.weights[j][k];
            }
            for (let k = 0; k < layer.hiddenState.length; k++) {
                forgetSum += layer.hiddenState[k] * layer.forgetGate.weights[j][k];
            }
            const forgetGate = this.activate(forgetSum, 'sigmoid');
    
            // Input gate
            let inputSum = layer.inputGate.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                inputSum += inputs[k] * layer.inputGate.weights[j][k];
            }
            for (let k = 0; k < layer.hiddenState.length; k++) {
                inputSum += layer.hiddenState[k] * layer.inputGate.weights[j][k];
            }
            const inputGate = this.activate(inputSum, 'sigmoid');
    
            // Candidate cell state
            let candidateSum = layer.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                candidateSum += inputs[k] * layer.weights[j][k];
            }
            const candidate = this.activate(candidateSum, 'tanh');
    
            // Update cell state
            const cellState = forgetGate * layer.cellState[j] + inputGate * candidate;
            newCellState.push(cellState);
    
            // Output gate
            let outputSum = layer.outputGate.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                outputSum += inputs[k] * layer.outputGate.weights[j][k];
            }
            for (let k = 0; k < layer.hiddenState.length; k++) {
                outputSum += layer.hiddenState[k] * layer.outputGate.weights[j][k];
            }
            const outputGate = this.activate(outputSum, 'sigmoid');
    
            // Hidden state
            const hiddenState = outputGate * this.activate(cellState, 'tanh');
            output.push(hiddenState);
            preActivations.push(cellState); // Store cell state as pre-activation
        }
    
        layer.cellState = newCellState;
        layer.hiddenState = output;
        layer.preActivations = preActivations;
    
        return output;
    }
    
    forwardGRU(layer, inputs) {
        const output = [];
        const preActivations = []; 
    
        for (let j = 0; j < layer.weights.length; j++) {
            // Update gate
            let updateSum = layer.updateGate.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                updateSum += inputs[k] * layer.updateGate.weights[j][k];
            }
            updateSum += layer.hiddenState[j];
            const updateGate = this.activate(updateSum, 'sigmoid');
    
            // Reset gate
            let resetSum = layer.resetGate.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                resetSum += inputs[k] * layer.resetGate.weights[j][k];
            }
            resetSum += layer.hiddenState[j];
            const resetGate = this.activate(resetSum, 'sigmoid');
    
            // Candidate hidden state
            let candidateSum = layer.biases[j];
            for (let k = 0; k < inputs.length; k++) {
                candidateSum += inputs[k] * layer.weights[j][k];
            }
            candidateSum += resetGate * layer.hiddenState[j];
            const candidate = this.activate(candidateSum, 'tanh');
    
            // New hidden state
            const hiddenState = (1 - updateGate) * layer.hiddenState[j] + updateGate * candidate;
            output.push(hiddenState);
            preActivations.push(candidateSum);
        }
    
        layer.hiddenState = output;
        layer.preActivations = preActivations;
        return output;
    }

    resetRecurrentStates() {
        for (let layer of this.layers) {
            if (layer.layerType === 'lstm') {
                layer.cellState = Array(layer.cellState.length).fill(0);
                layer.hiddenState = Array(layer.hiddenState.length).fill(0);
            } else if (layer.layerType === 'gru') {
                layer.hiddenState = Array(layer.hiddenState.length).fill(0);
            }
        }
    }

    // ========================================================================
    // Attention Mechanism
    // ========================================================================

    createAttentionLayer(size, heads = 4) {
        const headSize = Math.floor(size / heads);

        return {
            type: 'attention',
            heads: heads,
            headSize: headSize,
            queryWeights: Array(heads).fill(0).map(() =>
                this.initializeWeights(headSize, size)),
            keyWeights: Array(heads).fill(0).map(() =>
                this.initializeWeights(headSize, size)),
            valueWeights: Array(heads).fill(0).map(() =>
                this.initializeWeights(headSize, size)),
            outputWeights: this.initializeWeights(size, size),
            outputBias: this.randomArray(size)
        };
    }

    multiHeadAttention(layer, queries, keys, values, mask = null) {
        const heads = [];

        for (let h = 0; h < layer.heads; h++) {
            // Compute Q, K, V for this head
            const Q = this.cpuMatMul([queries], layer.queryWeights[h])[0];
            const K = this.cpuMatMul([keys], layer.keyWeights[h])[0];
            const V = this.cpuMatMul([values], layer.valueWeights[h])[0];

            // Scaled dot-product attention
            const scores = [];
            const scale = Math.sqrt(layer.headSize);

            for (let i = 0; i < Q.length; i++) {
                let score = 0;
                for (let j = 0; j < K.length; j++) {
                    score += Q[i] * K[j];
                }
                scores.push(score / scale);
            }

            // Apply mask if provided
            if (mask) {
                for (let i = 0; i < scores.length; i++) {
                    if (mask[i] === 0) scores[i] = -Infinity;
                }
            }

            // Softmax
            const expScores = scores.map(s => Math.exp(s));
            const sumExp = expScores.reduce((a, b) => a + b, 0);
            const attention = expScores.map(e => e / sumExp);

            // Apply attention to values
            const headOutput = [];
            for (let i = 0; i < V.length; i++) {
                headOutput.push(attention[i] * V[i]);
            }
            heads.push(headOutput);
        }

        // Concatenate heads
        const concatenated = heads.flat();

        // Final linear transformation
        const output = [];
        for (let i = 0; i < layer.outputWeights.length; i++) {
            let sum = layer.outputBias[i];
            for (let j = 0; j < concatenated.length; j++) {
                sum += concatenated[j] * layer.outputWeights[i][j];
            }
            output.push(sum);
        }

        return output;
    }

    // ========================================================================
    // Convolutional Layers for Images
    // ========================================================================

    createConvLayer(inputChannels, outputChannels, kernelSize = 3, stride = 1, padding = 1) {
        return {
            type: 'conv2d',
            inputChannels,
            outputChannels,
            kernelSize,
            stride,
            padding,
            filters: Array(outputChannels).fill(0).map(() =>
                Array(inputChannels).fill(0).map(() =>
                    Array(kernelSize).fill(0).map(() =>
                        Array(kernelSize).fill(0).map(() => (Math.random() * 2 - 1) * 0.01)
                    )
                )
            ),
            biases: this.randomArray(outputChannels)
        };
    }

    convolve2D(input, filter, stride = 1, padding = 0) {
        const inputHeight = input.length;
        const inputWidth = input[0].length;
        const filterHeight = filter.length;
        const filterWidth = filter[0].length;

        // Add padding
        const paddedInput = this.padImage(input, padding);

        const outputHeight = Math.floor((inputHeight + 2 * padding - filterHeight) / stride) + 1;
        const outputWidth = Math.floor((inputWidth + 2 * padding - filterWidth) / stride) + 1;

        const output = Array(outputHeight).fill(0).map(() => Array(outputWidth).fill(0));

        for (let i = 0; i < outputHeight; i++) {
            for (let j = 0; j < outputWidth; j++) {
                let sum = 0;
                for (let fi = 0; fi < filterHeight; fi++) {
                    for (let fj = 0; fj < filterWidth; fj++) {
                        const inputRow = i * stride + fi;
                        const inputCol = j * stride + fj;
                        sum += paddedInput[inputRow][inputCol] * filter[fi][fj];
                    }
                }
                output[i][j] = sum;
            }
        }

        return output;
    }

    padImage(image, padding) {
        if (padding === 0) return image;

        const height = image.length;
        const width = image[0].length;
        const padded = Array(height + 2 * padding).fill(0).map(() =>
            Array(width + 2 * padding).fill(0)
        );

        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                padded[i + padding][j + padding] = image[i][j];
            }
        }

        return padded;
    }

    maxPool2D(input, poolSize = 2, stride = 2) {
        const inputHeight = input.length;
        const inputWidth = input[0].length;
        const outputHeight = Math.floor((inputHeight - poolSize) / stride) + 1;
        const outputWidth = Math.floor((inputWidth - poolSize) / stride) + 1;

        const output = Array(outputHeight).fill(0).map(() => Array(outputWidth).fill(0));

        for (let i = 0; i < outputHeight; i++) {
            for (let j = 0; j < outputWidth; j++) {
                let max = -Infinity;
                for (let pi = 0; pi < poolSize; pi++) {
                    for (let pj = 0; pj < poolSize; pj++) {
                        const val = input[i * stride + pi][j * stride + pj];
                        if (val > max) max = val;
                    }
                }
                output[i][j] = max;
            }
        }

        return output;
    }

    // ========================================================================
    // NLP: Tokenization and Embeddings
    // ========================================================================

    createEmbeddings(vocabSize, embeddingSize) {
        this.embeddings = Array(vocabSize).fill(0).map(() =>
            Array(embeddingSize).fill(0).map(() => (Math.random() * 2 - 1) * 0.01)
        );
    }

    tokenize(text, lowercase = true) {
        const processed = lowercase ? text.toLowerCase() : text;
        // Simple word tokenization
        const tokens = processed.match(/\b\w+\b|[.,!?;]/g) || [];
        return tokens;
    }

    buildVocabulary(texts, minFreq = 2) {
        const wordCounts = {};

        for (const text of texts) {
            const tokens = this.tokenize(text);
            for (const token of tokens) {
                wordCounts[token] = (wordCounts[token] || 0) + 1;
            }
        }

        // Build vocabulary from frequent words
        this.vocabulary = { '<PAD>': 0, '<UNK>': 1, '<START>': 2, '<END>': 3 };
        let index = 4;

        for (const [word, count] of Object.entries(wordCounts)) {
            if (count >= minFreq) {
                this.vocabulary[word] = index++;
            }
        }

        // Create embeddings
        this.createEmbeddings(Object.keys(this.vocabulary).length, this.embeddingSize);

        return this.vocabulary;
    }

    textToIndices(text, maxLength = null) {
        const tokens = this.tokenize(text);
        const length = maxLength || this.maxSequenceLength;
        const indices = [];

        for (let i = 0; i < Math.min(tokens.length, length); i++) {
            const token = tokens[i];
            indices.push(this.vocabulary[token] || this.vocabulary['<UNK>']);
        }

        // Pad if necessary
        while (indices.length < length) {
            indices.push(this.vocabulary['<PAD>']);
        }

        return indices;
    }

    embed(indices) {
        return indices.map(idx => this.embeddings[idx] || this.embeddings[this.vocabulary['<UNK>']]);
    }

    generateText(seedText, maxLength = 50, temperature = 1.0) {
        const tokens = this.tokenize(seedText);
        const generated = [...tokens];

        this.resetRecurrentStates();

        for (let i = 0; i < maxLength; i++) {
            const indices = generated.slice(-this.maxSequenceLength).map(t =>
                this.vocabulary[t] || this.vocabulary['<UNK>']
            );
            const embedded = this.embed(indices);

            // Predict next token
            const output = this.predict(embedded.flat());

            // Sample from output with temperature
            const probs = this.softmaxWithTemperature(output, temperature);
            const nextIdx = this.sampleFromDistribution(probs);

            // Convert index back to token
            const nextToken = Object.keys(this.vocabulary).find(
                key => this.vocabulary[key] === nextIdx
            );

            if (nextToken === '<END>') break;
            generated.push(nextToken);
        }

        return generated.join(' ');
    }

    softmaxWithTemperature(logits, temperature) {
        const scaled = logits.map(x => x / temperature);
        const maxLogit = Math.max(...scaled);
        const exps = scaled.map(x => Math.exp(x - maxLogit));
        const sumExps = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sumExps);
    }

    sampleFromDistribution(probs) {
        const rand = Math.random();
        let cumsum = 0;
        for (let i = 0; i < probs.length; i++) {
            cumsum += probs[i];
            if (rand < cumsum) return i;
        }
        return probs.length - 1;
    }

    // ========================================================================
    // Audio Processing
    // ========================================================================

    extractMFCC(audioBuffer, numCoefficients = 13) {
        // Convert audio to mel-frequency cepstral coefficients
        const frameSize = 512;
        const hopSize = 256;
        const frames = this.frameAudio(audioBuffer, frameSize, hopSize);

        const mfccs = frames.map(frame => {
            const spectrum = this.fft(frame);
            const melSpectrum = this.melFilterbank(spectrum, numCoefficients);
            return this.dct(melSpectrum.map(x => Math.log(x + 1e-10)));
        });

        return mfccs;
    }

    frameAudio(buffer, frameSize, hopSize) {
        const frames = [];
        for (let i = 0; i + frameSize <= buffer.length; i += hopSize) {
            frames.push(buffer.slice(i, i + frameSize));
        }
        return frames;
    }

    fft(signal) {
        const N = signal.length;

        // Base case
        if (N === 1) return [{ re: signal[0], im: 0 }];

        // Ensure power of 2
        if (N % 2 !== 0) {
            const nextPow2 = Math.pow(2, Math.ceil(Math.log2(N)));
            const padded = [...signal];
            while (padded.length < nextPow2) {
                padded.push(0);
            }
            return this.fft(padded);
        }

        // Recursive FFT
        const even = this.fft(signal.filter((_, i) => i % 2 === 0));
        const odd = this.fft(signal.filter((_, i) => i % 2 === 1));

        const result = new Array(N);
        for (let k = 0; k < N / 2; k++) {
            const angle = -2 * Math.PI * k / N;
            const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };

            const oddTerm = {
                re: twiddle.re * odd[k].re - twiddle.im * odd[k].im,
                im: twiddle.re * odd[k].im + twiddle.im * odd[k].re
            };

            result[k] = {
                re: even[k].re + oddTerm.re,
                im: even[k].im + oddTerm.im
            };
            result[k + N / 2] = {
                re: even[k].re - oddTerm.re,
                im: even[k].im - oddTerm.im
            };
        }

        // Return magnitudes
        return result.map(c => Math.sqrt(c.re * c.re + c.im * c.im));
    }

    // ========================================================================
    // Image Processing Utilities
    // ========================================================================

    imageToArray(imageData, normalize = true) {
        // Convert ImageData or canvas to array
        const data = imageData.data || imageData;
        const pixels = [];

        for (let i = 0; i < data.length; i += 4) {
            // Convert RGB to grayscale
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            pixels.push(normalize ? gray / 255 : gray);
        }

        return pixels;
    }

    arrayToImage(array, width, height) {
        // Convert array back to ImageData
        const imageData = new ImageData(width, height);

        for (let i = 0; i < array.length; i++) {
            const value = Math.floor(array[i] * 255);
            imageData.data[i * 4] = value;     // R
            imageData.data[i * 4 + 1] = value; // G
            imageData.data[i * 4 + 2] = value; // B
            imageData.data[i * 4 + 3] = 255;   // A
        }

        return imageData;
    }

    resizeImage(imageArray, oldWidth, oldHeight, newWidth, newHeight) {
        // Simple nearest-neighbor resize
        const resized = [];
        const xRatio = oldWidth / newWidth;
        const yRatio = oldHeight / newHeight;

        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const srcX = Math.floor(x * xRatio);
                const srcY = Math.floor(y * yRatio);
                const srcIndex = srcY * oldWidth + srcX;
                resized.push(imageArray[srcIndex]);
            }
        }

        return resized;
    }

    augmentImage(imageArray, width, height, options = {}) {
        // Data augmentation for training
        const augmented = [...imageArray];

        // Random horizontal flip
        if (options.flip && Math.random() > 0.5) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width / 2; x++) {
                    const leftIdx = y * width + x;
                    const rightIdx = y * width + (width - 1 - x);
                    [augmented[leftIdx], augmented[rightIdx]] =
                        [augmented[rightIdx], augmented[leftIdx]];
                }
            }
        }

        // Random brightness adjustment
        if (options.brightness) {
            const factor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            for (let i = 0; i < augmented.length; i++) {
                augmented[i] = Math.max(0, Math.min(1, augmented[i] * factor));
            }
        }

        // Random noise
        if (options.noise) {
            const noiseLevel = options.noiseLevel || 0.05;
            for (let i = 0; i < augmented.length; i++) {
                const noise = (Math.random() - 0.5) * noiseLevel;
                augmented[i] = Math.max(0, Math.min(1, augmented[i] + noise));
            }
        }

        return augmented;
    }

    // ========================================================================
    // Batch Processing for Different Data Types
    // ========================================================================

    trainOnTextBatch(texts, targets, options = {}) {
        const epochs = options.epochs || 10;
        const verbose = options.verbose || false;

        // Build vocabulary if not exists
        if (Object.keys(this.vocabulary).length === 0) {
            this.buildVocabulary(texts);
        }

        const history = { loss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < texts.length; i++) {
                // Convert text to indices
                const indices = this.textToIndices(texts[i]);
                // Get embeddings
                const embedded = this.embed(indices);
                // Flatten for network input
                const input = embedded.flat();

                // Train
                const output = this.train(input, targets[i]);
                totalLoss += NeuralNetworkUtils.mse(output, targets[i]);

                // Reset recurrent states between sequences
                if (i < texts.length - 1) {
                    this.resetRecurrentStates();
                }
            }

            const avgLoss = totalLoss / texts.length;
            history.loss.push(avgLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(4)}`);
            }
        }

        return history;
    }

    trainOnImageBatch(images, labels, options = {}) {
        const epochs = options.epochs || 10;
        const augment = options.augment || false;
        const verbose = options.verbose || false;

        const history = { loss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < images.length; i++) {
                let imageData = images[i];

                // Apply augmentation
                if (augment) {
                    imageData = this.augmentImage(
                        imageData,
                        Math.sqrt(imageData.length),
                        Math.sqrt(imageData.length),
                        { flip: true, brightness: true, noise: true, noiseLevel: 0.05 }
                    );
                }

                // Train
                const output = this.train(imageData, labels[i]);
                totalLoss += NeuralNetworkUtils.mse(output, labels[i]);
            }

            const avgLoss = totalLoss / images.length;
            history.loss.push(avgLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(4)}`);
            }
        }

        return history;
    }

    trainOnAudioBatch(audioBuffers, labels, options = {}) {
        const epochs = options.epochs || 10;
        const numMFCCs = options.numMFCCs || 13;
        const verbose = options.verbose || false;

        const history = { loss: [] };

        // Extract MFCCs from all audio
        const allMFCCs = audioBuffers.map(buffer => this.extractMFCC(buffer, numMFCCs));

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < allMFCCs.length; i++) {
                // Reset recurrent states for each audio sample
                this.resetRecurrentStates();

                // Process each frame
                for (let frame of allMFCCs[i]) {
                    const output = this.train(frame, labels[i]);
                    totalLoss += NeuralNetworkUtils.mse(output, labels[i]);
                }
            }

            const avgLoss = totalLoss / (audioBuffers.length * allMFCCs[0].length);
            history.loss.push(avgLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(4)}`);
            }
        }

        return history;
    }

    // ========================================================================
    // Sequence-to-Sequence Methods
    // ========================================================================

    trainSeq2Seq(inputTexts, targetTexts, options = {}) {
        const epochs = options.epochs || 50;
        const verbose = options.verbose || false;

        // Build vocabulary from both input and target texts
        const allTexts = [...inputTexts, ...targetTexts];
        if (Object.keys(this.vocabulary).length === 0) {
            this.buildVocabulary(allTexts);
        }

        const history = { loss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < inputTexts.length; i++) {
                // Encode input sequence
                this.resetRecurrentStates();
                const inputIndices = this.textToIndices(inputTexts[i]);
                const inputEmbedded = this.embed(inputIndices);

                // Process input sequence (encoder)
                for (let frame of inputEmbedded) {
                    this.predict(frame);
                }

                // Decode target sequence (decoder)
                const targetIndices = this.textToIndices(targetTexts[i]);
                const targetEmbedded = this.embed(targetIndices);

                for (let t = 0; t < targetEmbedded.length - 1; t++) {
                    const input = targetEmbedded[t];
                    const target = this.oneHotEncode(targetIndices[t + 1]);

                    const output = this.train(input, target);
                    totalLoss += NeuralNetworkUtils.mse(output, target);
                }
            }

            const avgLoss = totalLoss / inputTexts.length;
            history.loss.push(avgLoss);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${avgLoss.toFixed(4)}`);
            }
        }

        return history;
    }

    translateSequence(inputText, maxLength = 50) {
        // Encode input
        this.resetRecurrentStates();
        const inputIndices = this.textToIndices(inputText);
        const inputEmbedded = this.embed(inputIndices);

        // Process encoder
        for (let frame of inputEmbedded) {
            this.predict(frame);
        }

        // Decode output
        const generated = ['<START>'];
        let currentToken = this.vocabulary['<START>'];

        for (let i = 0; i < maxLength; i++) {
            const embedding = this.embeddings[currentToken];
            const output = this.predict(embedding);

            // Get most likely next token
            const nextIdx = output.indexOf(Math.max(...output));
            const nextToken = Object.keys(this.vocabulary).find(
                key => this.vocabulary[key] === nextIdx
            );

            if (nextToken === '<END>') break;

            generated.push(nextToken);
            currentToken = nextIdx;
        }

        return generated.slice(1).join(' ');
    }

    oneHotEncode(index) {
        const vocabSize = Object.keys(this.vocabulary).length;
        const encoded = Array(vocabSize).fill(0);
        encoded[index] = 1;
        return encoded;
    }

    // ========================================================================
    // Generative Methods (GANs, VAEs)
    // ========================================================================

    generateImage(latentVector) {
        // Generate image from latent vector (for GAN generator)
        const output = this.predict(latentVector);

        // Reshape to 2D if needed
        const size = Math.sqrt(output.length);
        const image2D = [];
        for (let i = 0; i < size; i++) {
            image2D.push(output.slice(i * size, (i + 1) * size));
        }

        return output; // Return flat array for compatibility
    }

    sampleLatentVector(size = 100, distribution = 'normal') {
        // Sample random latent vector
        const vector = [];

        if (distribution === 'normal') {
            // Box-Muller transform for normal distribution
            for (let i = 0; i < size; i += 2) {
                const u1 = Math.random();
                const u2 = Math.random();
                const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
                vector.push(z1);
                if (i + 1 < size) vector.push(z2);
            }
        } else {
            // Uniform distribution
            for (let i = 0; i < size; i++) {
                vector.push(Math.random() * 2 - 1);
            }
        }

        return vector;
    }

    interpolateLatent(latentA, latentB, steps = 10) {
        // Interpolate between two latent vectors
        const interpolations = [];

        for (let i = 0; i <= steps; i++) {
            const alpha = i / steps;
            const interpolated = latentA.map((val, idx) =>
                val * (1 - alpha) + latentB[idx] * alpha
            );
            interpolations.push(interpolated);
        }

        return interpolations;
    }

    trainGAN(realData, options = {}) {
        // Simplified GAN training (discriminator logic would be separate)
        const epochs = options.epochs || 100;
        const batchSize = options.batchSize || 32;
        const latentSize = options.latentSize || 100;
        const verbose = options.verbose || false;

        const history = { generatorLoss: [], discriminatorLoss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let genLoss = 0;

            for (let i = 0; i < batchSize; i++) {
                // Generate fake data
                const latent = this.sampleLatentVector(latentSize);
                const generated = this.predict(latent);

                // Train generator to fool discriminator
                // (In real implementation, this would involve discriminator feedback)
                const realSample = realData[Math.floor(Math.random() * realData.length)];
                const output = this.train(latent, realSample);
                genLoss += NeuralNetworkUtils.mse(output, realSample);
            }

            history.generatorLoss.push(genLoss / batchSize);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Generator Loss = ${(genLoss / batchSize).toFixed(4)}`);
            }
        }

        return history;
    }

    // ========================================================================
    // Transfer Learning
    // ========================================================================

    freezeLayers(layerIndices) {
        // Freeze specified layers (prevent weight updates)
        if (!this.frozenLayers) {
            this.frozenLayers = new Set();
        }

        for (let idx of layerIndices) {
            this.frozenLayers.add(idx);
        }

        console.log(`Frozen layers: ${Array.from(this.frozenLayers).join(', ')}`);
    }

    unfreezeLayers(layerIndices = null) {
        // Unfreeze layers
        if (layerIndices === null) {
            this.frozenLayers = new Set();
            console.log('All layers unfrozen');
        } else {
            for (let idx of layerIndices) {
                this.frozenLayers.delete(idx);
            }
            console.log(`Unfrozen layers: ${layerIndices.join(', ')}`);
        }
    }

    replaceOutputLayer(newOutputSize, activation = 'sigmoid') {
        // Replace final layer for transfer learning
        const lastLayerIdx = this.layers.length - 1;
        const inputSize = this.layers[lastLayerIdx].weights[0].length;

        this.layers[lastLayerIdx] = {
            weights: this.initializeWeights(newOutputSize, inputSize),
            biases: this.randomArray(newOutputSize),
            activations: [],
            inputs: [],
            activationType: activation,
            layerType: 'dense',
            velocityW: this.createZeroMatrix(newOutputSize, inputSize),
            velocityB: Array(newOutputSize).fill(0),
            mW: this.createZeroMatrix(newOutputSize, inputSize),
            mB: Array(newOutputSize).fill(0),
            vW: this.createZeroMatrix(newOutputSize, inputSize),
            vB: Array(newOutputSize).fill(0),
            dropoutMask: []
        };

        console.log(`Output layer replaced with ${newOutputSize} units`);
    }

    extractFeatures(inputs) {
        // Extract features from penultimate layer
        let current = inputs;

        for (let i = 0; i < this.layers.length - 1; i++) {
            const layer = this.layers[i];
            layer.inputs = current;

            const output = [];
            for (let j = 0; j < layer.weights.length; j++) {
                let sum = layer.biases[j];
                for (let k = 0; k < current.length; k++) {
                    sum += current[k] * layer.weights[j][k];
                }
                output.push(this.activate(sum, layer.activationType));
            }

            current = output;
        }

        return current;
    }

    updateWeights(layer, gradients, layerIndex) {
        // Check if layer is frozen
        if (this.frozenLayers && this.frozenLayers.has(layerIndex)) {
            return; // Skip updates for frozen layers
        }

        switch (this.optimizer) {
            case 'momentum':
                this.updateMomentum(layer, gradients);
                break;
            case 'adam':
                this.updateAdam(layer, gradients);
                break;
            default:
                this.updateSGD(layer, gradients);
        }
    }

    // ========================================================================
    // Ensemble Methods
    // ========================================================================

    createEnsemble(numModels = 5) {
        // Create multiple models with same architecture
        this.ensemble = [];

        for (let i = 0; i < numModels; i++) {
            const model = new NeuralNetwork(
                this.layers[0].weights[0].length,
                this.layers.slice(0, -1).map(l => l.weights.length),
                this.layers[this.layers.length - 1].weights.length,
                {
                    learningRate: this.learningRate,
                    activation: this.activation,
                    optimizer: this.optimizer
                }
            );
            this.ensemble.push(model);
        }

        console.log(`Ensemble of ${numModels} models created`);
        return this.ensemble;
    }

    trainEnsemble(inputs, targets, options = {}) {
        if (!this.ensemble || this.ensemble.length === 0) {
            console.error('No ensemble created. Call createEnsemble() first.');
            return;
        }

        const epochs = options.epochs || 50;
        const verbose = options.verbose || false;

        const histories = this.ensemble.map(() => ({ loss: [] }));

        for (let epoch = 0; epoch < epochs; epoch++) {
            for (let m = 0; m < this.ensemble.length; m++) {
                let totalLoss = 0;

                // Train each model on slightly different data (bagging)
                const sampleSize = Math.floor(inputs.length * 0.8);
                for (let i = 0; i < sampleSize; i++) {
                    const idx = Math.floor(Math.random() * inputs.length);
                    const output = this.ensemble[m].train(inputs[idx], targets[idx]);
                    totalLoss += NeuralNetworkUtils.mse(output, targets[idx]);
                }

                histories[m].loss.push(totalLoss / sampleSize);
            }

            if (verbose && epoch % 10 === 0) {
                const avgLoss = histories.reduce((sum, h) =>
                    sum + h.loss[h.loss.length - 1], 0) / histories.length;
                console.log(`Epoch ${epoch}: Avg Ensemble Loss = ${avgLoss.toFixed(4)}`);
            }
        }

        return histories;
    }

    predictEnsemble(inputs, method = 'average') {
        if (!this.ensemble || this.ensemble.length === 0) {
            console.error('No ensemble available');
            return this.predict(inputs);
        }

        const predictions = this.ensemble.map(model => model.predict(inputs));

        if (method === 'average') {
            // Average predictions
            const avgPrediction = Array(predictions[0].length).fill(0);
            for (let pred of predictions) {
                for (let i = 0; i < pred.length; i++) {
                    avgPrediction[i] += pred[i];
                }
            }
            return avgPrediction.map(v => v / predictions.length);
        } else if (method === 'voting') {
            // Majority voting for classification
            const votes = Array(predictions[0].length).fill(0);
            for (let pred of predictions) {
                const maxIdx = pred.indexOf(Math.max(...pred));
                votes[maxIdx]++;
            }
            const result = Array(predictions[0].length).fill(0);
            const winnerIdx = votes.indexOf(Math.max(...votes));
            result[winnerIdx] = 1;
            return result;
        }

        return predictions[0];
    }

    // ========================================================================
    // Advanced Training Techniques
    // ========================================================================

    trainWithCurriculumLearning(easyData, hardData, options = {}) {
        // Start with easy examples, gradually increase difficulty
        const easyEpochs = options.easyEpochs || 20;
        const hardEpochs = options.hardEpochs || 30;
        const verbose = options.verbose || false;

        const history = { easyLoss: [], hardLoss: [] };

        // Phase 1: Train on easy data
        if (verbose) console.log('Phase 1: Training on easy examples');
        for (let epoch = 0; epoch < easyEpochs; epoch++) {
            let totalLoss = 0;
            for (let i = 0; i < easyData.inputs.length; i++) {
                const output = this.train(easyData.inputs[i], easyData.targets[i]);
                totalLoss += NeuralNetworkUtils.mse(output, easyData.targets[i]);
            }
            history.easyLoss.push(totalLoss / easyData.inputs.length);

            if (verbose && epoch % 10 === 0) {
                console.log(`Easy Epoch ${epoch}: Loss = ${history.easyLoss[epoch].toFixed(4)}`);
            }
        }

        // Phase 2: Train on hard data
        if (verbose) console.log('Phase 2: Training on hard examples');
        for (let epoch = 0; epoch < hardEpochs; epoch++) {
            let totalLoss = 0;
            for (let i = 0; i < hardData.inputs.length; i++) {
                const output = this.train(hardData.inputs[i], hardData.targets[i]);
                totalLoss += NeuralNetworkUtils.mse(output, hardData.targets[i]);
            }
            history.hardLoss.push(totalLoss / hardData.inputs.length);

            if (verbose && epoch % 10 === 0) {
                console.log(`Hard Epoch ${epoch}: Loss = ${history.hardLoss[epoch].toFixed(4)}`);
            }
        }

        return history;
    }

    trainWithMixup(inputs, targets, options = {}) {
        // Mixup data augmentation
        const alpha = options.alpha || 0.2;
        const epochs = options.epochs || 50;
        const verbose = options.verbose || false;

        const history = { loss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < inputs.length; i++) {
                // Select random pair
                const j = Math.floor(Math.random() * inputs.length);

                // Sample lambda from Beta distribution (simplified as uniform)
                const lambda = Math.random() * alpha + (1 - alpha / 2);

                // Mix inputs and targets
                const mixedInput = inputs[i].map((val, idx) =>
                    lambda * val + (1 - lambda) * inputs[j][idx]
                );
                const mixedTarget = targets[i].map((val, idx) =>
                    lambda * val + (1 - lambda) * targets[j][idx]
                );

                const output = this.train(mixedInput, mixedTarget);
                totalLoss += NeuralNetworkUtils.mse(output, mixedTarget);
            }

            history.loss.push(totalLoss / inputs.length);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${history.loss[epoch].toFixed(4)}`);
            }
        }

        return history;
    }

    trainWithLabelSmoothing(inputs, targets, options = {}) {
        // Label smoothing for better generalization
        const smoothing = options.smoothing || 0.1;
        const epochs = options.epochs || 50;
        const verbose = options.verbose || false;

        // Apply label smoothing to targets
        const smoothedTargets = targets.map(target =>
            target.map(val => {
                if (val === 1) return 1 - smoothing;
                if (val === 0) return smoothing / (target.length - 1);
                return val;
            })
        );

        const history = { loss: [] };

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;

            for (let i = 0; i < inputs.length; i++) {
                const output = this.train(inputs[i], smoothedTargets[i]);
                totalLoss += NeuralNetworkUtils.mse(output, smoothedTargets[i]);
            }

            history.loss.push(totalLoss / inputs.length);

            if (verbose && epoch % 10 === 0) {
                console.log(`Epoch ${epoch}: Loss = ${history.loss[epoch].toFixed(4)}`);
            }
        }

        return history;
    }

    // Animate network with input
    /* 
        // Create and train network
        const nn = new NeuralNetwork(4, [8, 6], 3, {
            activation: 'relu',
            learningRate: 0.01
        });

        // Draw static network
        nn.drawNetwork(canvas, {
            nodeRadius: 10,
            nodeColor: '#4CAF50',
            activeNodeColor: '#FF5722',
            lineColor: '#90A4AE',
            activeLineColor: '#FFC107',
            showLabels: true
        });

        // After making a prediction, draw with activations highlighted
        const input = [0.5, 0.8, 0.2, 0.9];
        nn.predict(input);
        nn.drawNetwork(canvas, {
            activationThreshold: 0.3,  // Nodes above this value highlight
            weightThreshold: 0.1       // Connections above this show
        });

        // Or animate the forward pass
        nn.animateNetwork(canvas, input, {
            animate: true,
            duration: 1000,
            fps: 30
        });
    */
    animateNetwork(canvas, inputs, options = {}) {
        const fps = options.fps || 30;
        const duration = options.duration || 1000; // ms

        // Predict to get activations
        this.predict(inputs);

        // Draw initial frame
        this.drawNetwork(canvas, options);

        // Optional: Create animation by gradually "flowing" through network
        if (options.animate) {
            let frame = 0;
            const totalFrames = (duration / 1000) * fps;

            const animate = () => {
                if (frame < totalFrames) {
                    const progress = frame / totalFrames;
                    const threshold = options.activationThreshold || 0.3;

                    this.drawNetwork(canvas, {
                        ...options,
                        activationThreshold: threshold * (1 - progress)
                    });

                    frame++;
                    setTimeout(animate, 1000 / fps);
                }
            };

            animate();
        }
    }

    // Get network topology info
    getTopology() {
        const layerSizes = [
            this.layers[0].weights[0].length,
            ...this.layers.map(l => l.weights.length)
        ];

        return {
            layers: layerSizes.length,
            sizes: layerSizes,
            totalNodes: layerSizes.reduce((a, b) => a + b, 0),
            totalWeights: this.layers.reduce((sum, l) =>
                sum + l.weights.flat().length, 0)
        };
    }

    getMemoryUsageMB() {
        let totalSize = 0;
        for (let layer of this.layers) {
            totalSize += layer.weights.flat().length * 8;
            totalSize += layer.biases.length * 8;
            totalSize += (layer.velocityW.flat().length + layer.velocityB.length) * 8;
            totalSize += (layer.mW.flat().length + layer.mB.length) * 8;
            totalSize += (layer.vW.flat().length + layer.vB.length) * 8;
        }
        if (this.experienceBuffer.length > 0) {
            const sampleExp = this.experienceBuffer[0];
            const expSize = (sampleExp.state.length + sampleExp.nextState.length + 3) * 8;
            totalSize += this.experienceBuffer.length * expSize;
        }
        return totalSize / (1024 * 1024);
    }

    checkMemoryUsage() {
        const usage = this.getMemoryUsageMB();
        if (usage > this.maxMemoryMB) {
            console.warn(`Memory usage (${usage.toFixed(2)}MB) exceeds limit. Cleaning...`);
            this.cleanupMemory();
        }
        return usage;
    }

    cleanupMemory() {
        for (let layer of this.layers) {
            layer.activations = [];
            layer.inputs = [];
            layer.preActivations = [];
            layer.dropoutMask = [];
        }
        if (this.experienceBuffer.length > this.bufferSize * 0.8) {
            const removeCount = Math.floor(this.bufferSize * 0.2);
            this.experienceBuffer.splice(0, removeCount);
        }
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
        }
    }

    setTrainingMode(training) {
        this.training = training;
    }

    getExperienceCount() {
        return this.experienceBuffer.length;
    }

    clearExperience() {
        this.experienceBuffer = [];
    }

    setLearningRate(rate) {
        this.learningRate = rate;
    }

    setEpsilon(epsilon) {
        this.epsilon = epsilon;
    }

    getStats() {
        return {
            memoryUsageMB: this.getMemoryUsageMB(),
            experienceCount: this.experienceBuffer.length,
            timeStep: this.timeStep,
            epsilon: this.epsilon,
            learningRate: this.learningRate,
            optimizer: this.optimizer,
            workersEnabled: this.useWorkers,
            numWorkers: this.workers.length
        };
    }

    createCheckpoint() {
        return {
            data: this.save(),
            generation: this.generation || 0,
            score: this.lastScore || 0,
            timestamp: Date.now()
        };
    }

    loadCheckpoint(checkpoint) {
        this.load(checkpoint.data);
        return {
            generation: checkpoint.generation,
            score: checkpoint.score,
            timestamp: new Date(checkpoint.timestamp).toISOString()
        };
    }

    save() {
        return JSON.stringify({
            // Network architecture
            layers: this.layers.map(l => ({
                weights: l.weights,
                biases: l.biases,
                activationType: l.activationType,
                layerType: l.layerType || 'dense',
                // Optimizer states
                velocityW: l.velocityW,
                velocityB: l.velocityB,
                mW: l.mW,
                mB: l.mB,
                vW: l.vW,
                vB: l.vB,
                // LSTM/GRU states
                forgetGate: l.forgetGate,
                inputGate: l.inputGate,
                outputGate: l.outputGate,
                updateGate: l.updateGate,
                resetGate: l.resetGate,
                cellState: l.cellState,
                hiddenState: l.hiddenState
            })),
            // Training state
            experienceBuffer: this.experienceBuffer,
            learningRate: this.learningRate,
            activation: this.activation,
            outputActivation: this.outputActivation,
            epsilon: this.epsilon,
            gamma: this.gamma,
            optimizer: this.optimizer,
            momentum: this.momentum,
            beta1: this.beta1,
            beta2: this.beta2,
            timeStep: this.timeStep,
            // NLP state
            vocabulary: this.vocabulary,
            embeddings: this.embeddings,
            embeddingSize: this.embeddingSize,
            maxSequenceLength: this.maxSequenceLength,
            // GPU settings
            useGPU: this.useGPU,
            gpuBackend: this.gpuBackend,
            // Advanced features
            frozenLayers: this.frozenLayers ? Array.from(this.frozenLayers) : [],
            layerTypes: this.layerTypes,
            // Metadata
            version: '3.0',
            savedAt: new Date().toISOString()
        });
    }

    load(data) {
        const obj = JSON.parse(data);
        
        // Load network structure
        obj.layers.forEach((saved, i) => {
            if (i >= this.layers.length) return;
            
            this.layers[i].weights = saved.weights;
            this.layers[i].biases = saved.biases;
            this.layers[i].activationType = saved.activationType;
            this.layers[i].layerType = saved.layerType || 'dense';
            
            // Restore optimizer states
            if (saved.velocityW) this.layers[i].velocityW = saved.velocityW;
            if (saved.velocityB) this.layers[i].velocityB = saved.velocityB;
            if (saved.mW) this.layers[i].mW = saved.mW;
            if (saved.mB) this.layers[i].mB = saved.mB;
            if (saved.vW) this.layers[i].vW = saved.vW;
            if (saved.vB) this.layers[i].vB = saved.vB;
            
            // Restore LSTM/GRU states
            if (saved.forgetGate) this.layers[i].forgetGate = saved.forgetGate;
            if (saved.inputGate) this.layers[i].inputGate = saved.inputGate;
            if (saved.outputGate) this.layers[i].outputGate = saved.outputGate;
            if (saved.updateGate) this.layers[i].updateGate = saved.updateGate;
            if (saved.resetGate) this.layers[i].resetGate = saved.resetGate;
            if (saved.cellState) this.layers[i].cellState = saved.cellState;
            if (saved.hiddenState) this.layers[i].hiddenState = saved.hiddenState;
        });
        
        // Restore training state
        this.experienceBuffer = obj.experienceBuffer || [];
        this.learningRate = obj.learningRate || 0.01;
        this.activation = obj.activation || 'relu';
        this.outputActivation = obj.outputActivation || 'sigmoid';
        this.epsilon = obj.epsilon || 0.1;
        this.gamma = obj.gamma || 0.95;
        this.optimizer = obj.optimizer || 'sgd';
        this.momentum = obj.momentum || 0.9;
        this.beta1 = obj.beta1 || 0.9;
        this.beta2 = obj.beta2 || 0.999;
        this.timeStep = obj.timeStep || 0;
        
        // Restore NLP state
        if (obj.vocabulary) this.vocabulary = obj.vocabulary;
        if (obj.embeddings) this.embeddings = obj.embeddings;
        if (obj.embeddingSize) this.embeddingSize = obj.embeddingSize;
        if (obj.maxSequenceLength) this.maxSequenceLength = obj.maxSequenceLength;
        
        // Restore GPU settings
        if (obj.useGPU !== undefined) this.useGPU = obj.useGPU;
        if (obj.gpuBackend) this.gpuBackend = obj.gpuBackend;
        
        // Restore advanced features
        if (obj.frozenLayers) this.frozenLayers = new Set(obj.frozenLayers);
        if (obj.layerTypes) this.layerTypes = obj.layerTypes;
        
        console.log(`Loaded network (v${obj.version || '1.0'}) from ${obj.savedAt || 'unknown time'}`);
        console.log(`Architecture: ${this.layers.map(l => l.weights.length).join('→')}`);
        console.log(`Time step: ${this.timeStep}, Epsilon: ${this.epsilon.toFixed(4)}`);
        
        if (Object.keys(this.vocabulary).length > 0) {
            console.log(`Vocabulary size: ${Object.keys(this.vocabulary).length}`);
        }
    }
}

// ============================================================================
// Network Templates
// ============================================================================

class NetworkTemplates {
    static classifier(inputSize, numClasses, options = {}) {
        return new NeuralNetwork(
            inputSize,
            [64, 32],
            numClasses,
            {
                activation: 'relu',
                outputActivation: 'sigmoid',
                learningRate: 0.01,
                optimizer: 'adam',
                dropout: 0.2,
                ...options
            }
        );
    }

    static deepClassifier(inputSize, numClasses, options = {}) {
        return new NeuralNetwork(
            inputSize,
            [128, 64, 32],
            numClasses,
            {
                activation: 'relu',
                outputActivation: 'sigmoid',
                learningRate: 0.001,
                optimizer: 'adam',
                dropout: 0.3,
                ...options
            }
        );
    }

    static regressor(inputSize, outputSize, options = {}) {
        return new NeuralNetwork(
            inputSize,
            [64, 32],
            outputSize,
            {
                activation: 'relu',
                outputActivation: 'linear',
                learningRate: 0.01,
                optimizer: 'adam',
                ...options
            }
        );
    }

    static qNetwork(stateSize, actionSize, options = {}) {
        return new NeuralNetwork(
            stateSize,
            [128, 64],
            actionSize,
            {
                activation: 'relu',
                outputActivation: 'linear',
                learningRate: 0.001,
                optimizer: 'adam',
                epsilon: 0.1,
                gamma: 0.99,
                bufferSize: 10000,
                batchSize: 64,
                ...options
            }
        );
    }

    static autoencoder(inputSize, encodingSize, options = {}) {
        const hiddenSize = Math.floor((inputSize + encodingSize) / 2);
        return new NeuralNetwork(
            inputSize,
            [hiddenSize, encodingSize, hiddenSize],
            inputSize,
            {
                activation: 'tanh',
                outputActivation: 'sigmoid',
                learningRate: 0.01,
                optimizer: 'adam',
                ...options
            }
        );
    }

    static patternRecognizer(inputSize, options = {}) {
        return new NeuralNetwork(
            inputSize,
            [32, 16],
            2,
            {
                activation: 'leaky_relu',
                outputActivation: 'sigmoid',
                learningRate: 0.01,
                optimizer: 'momentum',
                ...options
            }
        );
    }

    static timeSeriesPredictor(windowSize, options = {}) {
        return new NeuralNetwork(
            windowSize,
            [64, 32, 16],
            1,
            {
                activation: 'tanh',
                outputActivation: 'linear',
                learningRate: 0.005,
                optimizer: 'adam',
                ...options
            }
        );
    }

    static batchNormalize(batch) {
        // Normalize a batch of data
        const numFeatures = batch[0].length;
        const normalized = [];
        
        for (let i = 0; i < numFeatures; i++) {
            const feature = batch.map(sample => sample[i]);
            const mean = feature.reduce((a, b) => a + b, 0) / feature.length;
            const variance = feature.reduce((a, b) => 
                a + Math.pow(b - mean, 2), 0) / feature.length;
            const std = Math.sqrt(variance + 1e-8);
            
            for (let j = 0; j < batch.length; j++) {
                if (!normalized[j]) normalized[j] = [];
                normalized[j][i] = (batch[j][i] - mean) / std;
            }
        }
        
        return normalized;
    }
    
    static augmentTextData(texts, numAugmented = 1) {
        // Simple text augmentation
        const augmented = [];
        
        for (let text of texts) {
            augmented.push(text);
            
            for (let i = 0; i < numAugmented; i++) {
                const words = text.split(' ');
                
                // Random word deletion
                if (Math.random() > 0.5 && words.length > 3) {
                    const idx = Math.floor(Math.random() * words.length);
                    words.splice(idx, 1);
                }
                
                // Random word swap
                if (Math.random() > 0.5 && words.length > 2) {
                    const i1 = Math.floor(Math.random() * words.length);
                    const i2 = Math.floor(Math.random() * words.length);
                    [words[i1], words[i2]] = [words[i2], words[i1]];
                }
                
                augmented.push(words.join(' '));
            }
        }
        
        return augmented;
    }
    
    static createMiniBatches(data, labels, batchSize = 32, shuffle = true) {
        // Create mini-batches for training
        const indices = Array.from({ length: data.length }, (_, i) => i);
        
        if (shuffle) {
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }
        
        const batches = [];
        for (let i = 0; i < indices.length; i += batchSize) {
            const batchIndices = indices.slice(i, i + batchSize);
            batches.push({
                data: batchIndices.map(idx => data[idx]),
                labels: batchIndices.map(idx => labels[idx])
            });
        }
        
        return batches;
    }
    
    static cosineSimilarity(vec1, vec2) {
        // Calculate cosine similarity between vectors
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    
    static calculatePerplexity(predictions, targets) {
        // Calculate perplexity for language models
        let totalLogProb = 0;
        let count = 0;
        
        for (let i = 0; i < predictions.length; i++) {
            for (let j = 0; j < predictions[i].length; j++) {
                if (targets[i][j] === 1) {
                    totalLogProb += Math.log(predictions[i][j] + 1e-10);
                    count++;
                }
            }
        }
        
        const avgLogProb = totalLogProb / count;
        return Math.exp(-avgLogProb);
    }
    
    static calculateBLEU(candidate, reference) {
        // Simplified BLEU score for translation
        const candWords = candidate.toLowerCase().split(' ');
        const refWords = reference.toLowerCase().split(' ');
        
        // Calculate n-gram precisions (unigram only for simplicity)
        let matches = 0;
        for (let word of candWords) {
            if (refWords.includes(word)) {
                matches++;
            }
        }
        
        const precision = candWords.length > 0 ? matches / candWords.length : 0;
        
        // Brevity penalty
        const bp = candWords.length >= refWords.length ? 
            1 : Math.exp(1 - refWords.length / candWords.length);
        
        return bp * precision;
    }
    
    static loadAudioFromFile(file, callback) {
        // Load audio file and convert to array buffer
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(e.target.result, function(buffer) {
                const audioData = buffer.getChannelData(0); // Mono audio
                callback(Array.from(audioData));
            });
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    static loadImageFromFile(file, targetSize, callback) {
        // Load and resize image
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetSize, targetSize);
                
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                const pixels = [];
                
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const gray = (imageData.data[i] + imageData.data[i+1] + imageData.data[i+2]) / 3;
                    pixels.push(gray / 255);
                }
                
                callback(pixels);
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }
    
    static printModelSummary(model) {
        // Print detailed model summary
        console.log('='.repeat(70));
        console.log('MODEL SUMMARY');
        console.log('='.repeat(70));
        
        const topology = model.getTopology();
        console.log(`Total Layers: ${topology.layers}`);
        console.log(`Total Nodes: ${topology.totalNodes}`);
        console.log(`Total Weights: ${topology.totalWeights}`);
        console.log(`Architecture: ${topology.sizes.join(' → ')}`);
        console.log('-'.repeat(70));
        
        let totalParams = 0;
        model.layers.forEach((layer, i) => {
            const weights = layer.weights.flat().length;
            const biases = layer.biases.length;
            const params = weights + biases;
            totalParams += params;
            
            console.log(`Layer ${i} (${layer.layerType || 'dense'}): ${layer.weights.length} units`);
            console.log(`  Activation: ${layer.activationType}`);
            console.log(`  Parameters: ${params} (${weights}W + ${biases}B)`);
            
            if (layer.layerType === 'lstm') {
                const gateParams = layer.forgetGate.weights.flat().length + 
                                  layer.forgetGate.biases.length;
                console.log(`  Gate Parameters: ${gateParams * 3}`);
            }
        });
        
        console.log('-'.repeat(70));
        console.log(`Total Parameters: ${totalParams}`);
        console.log(`Memory Usage: ${model.getMemoryUsageMB().toFixed(2)} MB`);
        console.log(`Optimizer: ${model.optimizer}`);
        console.log(`Learning Rate: ${model.learningRate}`);
        console.log(`GPU Enabled: ${model.useGPU}`);
        
        if (Object.keys(model.vocabulary).length > 0) {
            console.log(`Vocabulary Size: ${Object.keys(model.vocabulary).length}`);
            console.log(`Embedding Size: ${model.embeddingSize}`);
        }
        
        console.log('='.repeat(70));
    }

    static textGenerator(vocabSize, embeddingSize, hiddenSize, options = {}) {
        // Create a network suitable for text generation
        // Input: embedded text sequences
        // Output: next word prediction (vocabulary size)
        
        const inputSize = embeddingSize * (options.maxSequenceLength || 20);
        
        return new NeuralNetwork(
            inputSize,
            [hiddenSize, Math.floor(hiddenSize * 0.75)],
            vocabSize,
            {
                activation: 'tanh',
                outputActivation: 'sigmoid',
                learningRate: options.learningRate || 0.01,
                optimizer: options.optimizer || 'adam',
                dropout: options.dropout || 0.2,
                layerTypes: options.layerTypes || ['lstm', 'dense'],
                embeddingSize: embeddingSize,
                maxSequenceLength: options.maxSequenceLength || 100,
                vocabulary: options.vocabulary || {},
                useGPU: options.useGPU || false,
                gpuBackend: options.gpuBackend || 'webgl',
                ...options
            }
        );
    }
    
    static imageClassifier(imageSize, numClasses, options = {}) {
        // Image classification network
        const inputSize = imageSize * imageSize; // For grayscale images
        
        return new NeuralNetwork(
            inputSize,
            [256, 128, 64],
            numClasses,
            {
                activation: 'relu',
                outputActivation: 'sigmoid',
                learningRate: options.learningRate || 0.001,
                optimizer: options.optimizer || 'adam',
                dropout: options.dropout || 0.3,
                useGPU: options.useGPU || false,
                gpuBackend: options.gpuBackend || 'webgl',
                ...options
            }
        );
    }
    
    static audioClassifier(numMFCCs, sequenceLength, numClasses, options = {}) {
        // Audio classification using MFCC features
        return new NeuralNetwork(
            numMFCCs,
            [128, 64],
            numClasses,
            {
                activation: 'tanh',
                outputActivation: 'sigmoid',
                learningRate: options.learningRate || 0.005,
                optimizer: options.optimizer || 'adam',
                layerTypes: ['lstm', 'dense'],
                dropout: options.dropout || 0.2,
                ...options
            }
        );
    }
    
    static sequenceToSequence(inputVocabSize, outputVocabSize, hiddenSize, options = {}) {
        // Seq2Seq model for translation, summarization, etc.
        return new NeuralNetwork(
            hiddenSize,
            [hiddenSize, Math.floor(hiddenSize * 0.75)],
            outputVocabSize,
            {
                activation: 'tanh',
                outputActivation: 'sigmoid',
                learningRate: options.learningRate || 0.001,
                optimizer: options.optimizer || 'adam',
                layerTypes: ['lstm', 'lstm', 'dense'],
                dropout: options.dropout || 0.2,
                embeddingSize: hiddenSize,
                ...options
            }
        );
    }
    
    static imageGenerator(latentSize, imageSize, options = {}) {
        // Generator network for GANs
        const outputSize = imageSize * imageSize;
        
        return new NeuralNetwork(
            latentSize,
            [128, 256, 512],
            outputSize,
            {
                activation: 'leaky_relu',
                outputActivation: 'tanh',
                learningRate: options.learningRate || 0.0002,
                optimizer: options.optimizer || 'adam',
                ...options
            }
        );
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

class NeuralNetworkUtils {
    static textToInput(text, maxLength = 10) {
        const normalized = text.toLowerCase().padEnd(maxLength, ' ').slice(0, maxLength);
        return Array.from(normalized).map(c => c.charCodeAt(0) / 127);
    }

    static normalize(values, min = null, max = null) {
        const actualMin = min !== null ? min : Math.min(...values);
        const actualMax = max !== null ? max : Math.max(...values);
        const range = actualMax - actualMin;
        return values.map(v => range === 0 ? 0 : (v - actualMin) / range);
    }

    static standardize(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        return values.map(v => std === 0 ? 0 : (v - mean) / std);
    }

    static mse(outputs, targets) {
        return outputs.reduce((sum, out, i) =>
            sum + Math.pow(targets[i] - out, 2), 0) / outputs.length;
    }

    static accuracy(predictions, targets) {
        let correct = 0;
        for (let i = 0; i < predictions.length; i++) {
            const predicted = predictions[i].indexOf(Math.max(...predictions[i]));
            const actual = targets[i].indexOf(Math.max(...targets[i]));
            if (predicted === actual) correct++;
        }
        return correct / predictions.length;
    }

    static oneHot(label, numClasses) {
        const encoded = Array(numClasses).fill(0);
        encoded[label] = 1;
        return encoded;
    }

    static trainTestSplit(data, labels, testSize = 0.2) {
        const indices = Array.from({ length: data.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const splitIndex = Math.floor(data.length * (1 - testSize));
        const trainIndices = indices.slice(0, splitIndex);
        const testIndices = indices.slice(splitIndex);

        return {
            trainData: trainIndices.map(i => data[i]),
            trainLabels: trainIndices.map(i => labels[i]),
            testData: testIndices.map(i => data[i]),
            testLabels: testIndices.map(i => labels[i])
        };
    }

    static createBatches(data, labels, batchSize) {
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push({
                data: data.slice(i, i + batchSize),
                labels: labels.slice(i, i + batchSize)
            });
        }
        return batches;
    }
}

// ============================================================================
// Export
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NeuralNetwork, NetworkTemplates, NeuralNetworkUtils };
}

if (typeof window !== 'undefined') {
    window.NeuralNetwork = NeuralNetwork;
    window.NetworkTemplates = NetworkTemplates;
    window.NeuralNetworkUtils = NeuralNetworkUtils;
}
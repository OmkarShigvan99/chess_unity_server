import { spawn } from "child_process";
import path from "path";
import os from "os";

export class StockfishEngine {
    constructor() {
        // Determine the correct Stockfish binary based on OS
        const stockfishPath = this.getStockfishPath();

        console.log(`Starting Stockfish engine: ${stockfishPath}`);
        console.log(`Operating System: ${os.platform()}`);

        this.stockfish = spawn(stockfishPath);
        this.stockfish.stdin.setDefaultEncoding("utf-8");
        this.currentLevel = null; // Track current configuration level

        this.stockfish.stdout.on("data", (data) => {
            console.log("ENGINE:", data.toString().trim());
        });

        this.stockfish.stderr.on("data", (data) => {
            console.error("ENGINE ERROR:", data.toString().trim());
        });

        this.stockfish.on("exit", (code) => {
            console.log("Stockfish exited with code", code);
        });

        this.stockfish.on("error", (error) => {
            console.error("Failed to start Stockfish:", error);
        });

        // Initialize UCI mode
        this.stockfish.stdin.write("uci\n");
    }

    /**
     * Get the appropriate Stockfish binary path based on the operating system
     * @returns {string} Path to the Stockfish executable
     */
    getStockfishPath() {
        const platform = os.platform();
        let stockfishBinary;

        switch (platform) {
            case "win32":
                // Windows
                stockfishBinary =
                    process.env.STOCKFISH_PATH_WINDOWS ||
                    "chess_engine/stockfish/stockfish-windows-x86-64-sse41-popcnt.exe";
                break;
            case "linux":
                // Linux (Docker)
                stockfishBinary =
                    process.env.STOCKFISH_PATH_LINUX ||
                    "chess_engine/stockfish/stockfish-linux-x86-64-sse41-popcnt";
                break;
            case "darwin":
                // macOS
                stockfishBinary =
                    process.env.STOCKFISH_PATH_MACOS ||
                    "chess_engine/stockfish/stockfish-macos-x86-64-sse41-popcnt";
                break;
            default:
                // Fallback to Linux binary
                console.warn(
                    `Unsupported platform: ${platform}, falling back to Linux binary`
                );
                stockfishBinary =
                    process.env.STOCKFISH_PATH_LINUX ||
                    "chess_engine/stockfish/stockfish-linux-x86-64-sse41-popcnt";
        }

        return path.join(path.resolve(), stockfishBinary);
    }

    /**
     * Get difficulty settings based on level (1-5)
     * @param {number} level - Difficulty level from 1 (easiest) to 5 (hardest)
     * @returns {Object} Settings for the engine
     */
    getDifficultySettings(level) {
        const settings = {
            1: {
                // Beginner
                depth: 1,
                skillLevel: 0,
                moveTime: 100,
                errorProbability: 0.8, // 80% chance to make suboptimal moves
                description: "Beginner - Makes many mistakes",
            },
            2: {
                // Easy
                depth: 3,
                skillLevel: 3,
                moveTime: 200,
                errorProbability: 0.6,
                description: "Easy - Occasional mistakes",
            },
            3: {
                // Medium
                depth: 6,
                skillLevel: 10,
                moveTime: 500,
                errorProbability: 0.3,
                description: "Medium - Balanced play",
            },
            4: {
                // Hard
                depth: 12,
                skillLevel: 17,
                moveTime: 1000,
                errorProbability: 0.1,
                description: "Hard - Strong play",
            },
            5: {
                // Expert
                depth: 18,
                skillLevel: 20,
                moveTime: 2000,
                errorProbability: 0,
                description: "Expert - Maximum strength",
            },
        };

        return settings[level] || settings[3]; // Default to medium if invalid level
    }

    /**
     * Configure engine settings for the given difficulty level
     * @param {number} level - Difficulty level (1-5)
     */
    async configureLevel(level) {
        // Skip reconfiguration if already at this level
        if (this.currentLevel === level) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const settings = this.getDifficultySettings(level);
            console.log(
                `Configuring engine for level ${level}: ${settings.description}`
            );

            let readyReceived = false;

            const handleReady = (data) => {
                if (data.toString().includes("readyok") && !readyReceived) {
                    readyReceived = true;
                    this.stockfish.stdout.removeListener("data", handleReady);
                    this.currentLevel = level; // Update current level
                    resolve();
                }
            };

            this.stockfish.stdout.on("data", handleReady);

            // Set UCI options for skill level
            this.stockfish.stdin.write(
                `setoption name Skill Level value ${settings.skillLevel}\n`
            );

            // For lower levels, also limit the engine's strength
            if (level <= 3) {
                this.stockfish.stdin.write(
                    `setoption name UCI_LimitStrength value true\n`
                );
                const eloRating = 800 + (level - 1) * 400; // 800, 1200, 1600 for levels 1-3
                this.stockfish.stdin.write(
                    `setoption name UCI_Elo value ${eloRating}\n`
                );
            } else {
                this.stockfish.stdin.write(
                    `setoption name UCI_LimitStrength value false\n`
                );
            }

            this.stockfish.stdin.write("isready\n");

            // Timeout fallback
            setTimeout(() => {
                if (!readyReceived) {
                    readyReceived = true;
                    this.stockfish.stdout.removeListener("data", handleReady);
                    this.currentLevel = level; // Update current level even on timeout
                    resolve();
                }
            }, 1000);
        });
    }

    async getBestMove(fen, options = { level: 3, movetime: null }) {
        return new Promise(async (resolve, reject) => {
            if (!this.stockfish)
                return reject("Stockfish engine not initialized.");

            const level = options.level || 3;
            const settings = this.getDifficultySettings(level);

            console.log(
                `Getting best move for level ${level} (${settings.description})`
            );

            try {
                // Configure engine for this level and wait for it to be ready
                await this.configureLevel(level);

                let bestMove = null;
                let isComplete = false;

                const handleData = (data) => {
                    const output = data.toString();

                    if (output.includes("bestmove")) {
                        const match = output.match(/bestmove (\w+)/);
                        if (match && !isComplete) {
                            isComplete = true;
                            bestMove = match[1];

                            this.stockfish.stdout.removeListener(
                                "data",
                                handleData
                            );
                            resolve(bestMove);
                        }
                    }
                };

                this.stockfish.stdout.on("data", handleData);

                // Set position and search
                this.stockfish.stdin.write(`position fen ${fen}\n`);

                if (options.movetime || settings.moveTime) {
                    this.stockfish.stdin.write(
                        `go movetime ${options.movetime || settings.moveTime}\n`
                    );
                } else {
                    this.stockfish.stdin.write(`go depth ${settings.depth}\n`);
                }

                // Timeout fallback
                setTimeout(() => {
                    if (!isComplete) {
                        isComplete = true;
                        this.stockfish.stdout.removeListener(
                            "data",
                            handleData
                        );
                        reject(new Error("Engine timeout"));
                    }
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });
    }

    quit() {
        this.stockfish.stdin.write("quit\n");
    }
}

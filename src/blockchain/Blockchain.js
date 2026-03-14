import CryptoJS from 'crypto-js';
import { supabase } from '../services/supabaseClient';

export class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash
    ).toString();
  }
}

export class Blockchain {
  constructor() {
    this.chain = [];
  }

  async initialize() {
    // Fetch the chain from Supabase
    const { data: blocks, error } = await supabase
      .from('blockchain_ledger')
      .select('*')
      .order('block_index', { ascending: true });

    if (!error && blocks && blocks.length > 0) {
      this.chain = blocks.map(
        (b) => new Block(b.block_index, parseInt(b.timestamp), b.data, b.previous_hash)
      );
      // Reassign hashes from db to avoid timestamp mismatches on recalculation
      this.chain.forEach((block, idx) => {
        block.hash = blocks[idx].hash;
      });
    } else {
      // Create Genesis block if empty
      const genesisBlock = this.createGenesisBlock();
      this.chain = [genesisBlock];
      await this.saveBlockToDB(genesisBlock);
    }
  }

  createGenesisBlock() {
    return new Block(0, Date.now(), { action: 'GENESIS', details: 'System initialization' }, '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  async addBlock(data) {
    if (this.chain.length === 0) {
        await this.initialize();
    }
    const previousBlock = this.getLatestBlock();
    const newBlock = new Block(
      this.chain.length,
      Date.now(),
      data,
      previousBlock.hash
    );
    this.chain.push(newBlock);
    await this.saveBlockToDB(newBlock);
    return newBlock;
  }

  async saveBlockToDB(block) {
    try {
      await supabase.from('blockchain_ledger').insert([
        {
          block_index: block.index,
          timestamp: block.timestamp,
          data: block.data,
          previous_hash: block.previousHash,
          hash: block.hash,
        },
      ]);
    } catch (err) {
      console.error('Error saving block to DB', err);
    }
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
        const currentBlock = this.chain[i];
        const previousBlock = this.chain[i - 1];

        // Recalculate hash internally to verify it matches
        const recalculatedHash = CryptoJS.SHA256(
            currentBlock.index + currentBlock.timestamp + JSON.stringify(currentBlock.data) + currentBlock.previousHash
        ).toString();

        if (currentBlock.hash !== recalculatedHash) {
            return false;
        }

        if (currentBlock.previousHash !== previousBlock.hash) {
            return false;
        }
    }
    return true;
  }
}

// Export a singleton instance
export const ledger = new Blockchain();

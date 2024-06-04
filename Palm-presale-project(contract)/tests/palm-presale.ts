import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { PalmPresale } from "../target/types/palm_presale";
import {
  PublicKey,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
// import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { BN } from "bn.js";
import {
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
// import { assert } from "chai";

describe("palm-presale", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection("http://localhost:8899");
  const program = anchor.workspace.PalmPresale as Program<PalmPresale>;
  const PROGRAM_ID = program.programId;

  const PRESALE_SEED = "PRESALE_SEED";
  const USER_SEED = "USER_SEED";

  // set buyer
  const myWallet = anchor.AnchorProvider.env().wallet;
  const payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
  const myPubkey = myWallet.publicKey;

  // set admin
  const admin = Keypair.generate();

  // set tokenMint
  let mint: PublicKey;
  let tokenAta: PublicKey;
  const tokenDecimal = 9;
  const amount = new BN(1000000000).mul(new BN(10 ** tokenDecimal));

  // presale setting
  const softCapAmount = new BN(300000);
  const hardCapAmount = new BN(500000);
  const maxTokenAmountPerAddress = new BN(1000);
  const pricePerToken = new BN(100);
  const startTime = new BN(1717307215421);
  const presaleTime = new BN(100000000);

  // deposit setting
  const presaleAmount = new BN(300000000).mul(new BN(10 ** tokenDecimal));

  // guyToken setting
  const quoteAmount = new BN(10000);

  // const getWalletPDA = async () => {
  //   return (
  //     await PublicKey.findProgramAddressSync(
  //       [Buffer.from(WALLET_SEED), admin.publicKey.toBuffer()],
  //       PROGRAM_ID
  //     )
  //   )[0];
  // };

  const getUserInfoPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED)],
        PROGRAM_ID
      )
    )[0];
  };

  const getPresalePDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(PRESALE_SEED)],
        PROGRAM_ID
      )
    )[0];
  };

  it("Airdrop to user wallet", async () => {
    console.log("Created a user, address is ", admin.publicKey.toBase58());
    console.log(
      `Requesting airdrop for another user ${admin.publicKey.toBase58()}`
    );
    // 1 - Request Airdrop
    const signature = await connection.requestAirdrop(admin.publicKey, 10 ** 9);
    // 2 - Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    // 3 - Confirm transaction success
    await connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature,
      },
      "finalized"
    );
    console.log(
      "user balance : ",
      (await connection.getBalance(admin.publicKey)) / 10 ** 9,
      "SOL"
    );
  });

  it("Mint token to user wallet", async () => {
    console.log("Trying to reate and mint token to user's wallet");
    console.log("Here, contract uses this token as LP token");
    console.log(
      (await connection.getBalance(admin.publicKey)) / LAMPORTS_PER_SOL
    );
    //create mint
    try {
      mint = await createMint(
        connection,
        admin,
        admin.publicKey,
        admin.publicKey,
        tokenDecimal
      );
      console.log("mint address: " + mint.toBase58());
      tokenAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          admin,
          mint,
          admin.publicKey
        )
      ).address;
      console.log("token account address: " + tokenAta.toBase58());
      //minting 100 new tokens to the token address we just created
      await mintTo(
        connection,
        admin,
        mint,
        tokenAta,
        admin.publicKey,
        BigInt(amount.toString())
      );
      const tokenBalance = await connection.getTokenAccountBalance(tokenAta);
      console.log("tokenBalance in user:", tokenBalance.value.uiAmount);
      console.log("token successfully minted");
    } catch (error) {
      console.log("Token creation error \n", error);
    }
  });

  it("Presale account is initialized!", async () => {
    // fetching accounts for transaction
    const presalePDA = await getPresalePDA();
    console.log(`Presale address: ${presalePDA}`);
    const endTime = startTime.add(presaleTime);

    // preparing transaction
    const tx = await program.methods
      .createPresale(
        mint,
        softCapAmount,
        hardCapAmount,
        maxTokenAmountPerAddress,
        pricePerToken,
        startTime,
        endTime
      )
      .accounts({
        presaleInfo: presalePDA,
        authority: admin.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // transcation confirmation stage
    // console.log(await connection.simulateTransaction(tx))
    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
    console.log(
      `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );

    // test result check
    const presaleState = await program.account.presaleInfo.fetch(presalePDA);
    console.log("presale state: ", presaleState);
    console.log("presale hard cap: ", presaleState.hardcapAmount.toString());
  });

  // it("Presale is updated!", async () => {
  //   // fetching accounts for transaction
  //   const presalePDA = await getPresalePDA();

  //   const endTime = startTime.add(presaleTime);

  //   // preparing transaction
  //   const tx = await program.methods
  //     .updatePresale(
  //       maxTokenAmountPerAddress,
  //       pricePerToken,
  //       softCapAmount,
  //       hardCapAmount,
  //       startTime,
  //       endTime
  //     )
  //     .accounts({
  //       presaleInfo: presalePDA,
  //       systemProgram: web3.SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .transaction();

  //   tx.feePayer = admin.publicKey;
  //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  //   const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
  //   console.log(
  //     `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=localnet`
  //   );

  //   // test result check
  //   const presaleState = await program.account.presaleInfo.fetch(presalePDA);
  //   console.log("presale state: ", presaleState);
  //   console.log("presale soft cap: ", presaleState.softcapAmount.toString());
  // });

  it("Token is deposited!", async () => {
    // fetching accounts for transaction
    const presalePDA = await getPresalePDA();

    // get associatedTokenAddress
    const toAssociatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      presalePDA,
      true
    );

    // preparing transaction
    const tx = await program.methods
      .depositToken(presaleAmount)
      .accounts({
        mintAccount: mint,
        fromAssociatedTokenAccount: tokenAta,
        fromAuthority: admin.publicKey,
        toAssociatedTokenAccount: toAssociatedTokenAccount,
        presaleInfo: presalePDA,
        payer: admin.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
    console.log(
      `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );
    console.log("Token mint address: ", mint.toBase58());
    console.log(
      "Token balance of presale: ",
      await connection.getTokenAccountBalance(toAssociatedTokenAccount)
    );
  });

  it("Presale start!", async () => {
    // fetching accounts for transaction
    const presalePDA = await getPresalePDA();

    const startTime = new BN(Date.now());

    // preparing transaction
    const tx = await program.methods
      .startPresale(startTime)
      .accounts({
        presaleInfo: presalePDA,
        authority: admin.publicKey,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);

    console.log(
      `Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );
    console.log("Start time: ", new Date(parseInt(startTime.toString())));
  });

  it("Buy token!", async () => {
    const presalePDA = await getPresalePDA();
    const tokenAmount = quoteAmount.div(pricePerToken);

    // get userInfo Address
    const userInfo = await getUserInfoPDA();

    // preparing transaction
    const tx = await program.methods
      .buyToken(quoteAmount, tokenAmount)
      .accounts({
        presaleInfo: presalePDA,
        presaleAuthority: admin.publicKey,
        userInfo: userInfo,
        buyer: myPubkey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([payer.payer])
      .transaction();

    tx.feePayer = myPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    console.log(await connection.simulateTransaction(tx))

    const signature = await sendAndConfirmTransaction(connection, tx, [
      payer.payer,
    ]);

    const userState = await program.account.userInfo.fetch(userInfo);

    console.log(
      `Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );
    console.log("User state: ", userState);
  });

  // it("Claim token!", async () => {

  //   const tx =

  // })
});

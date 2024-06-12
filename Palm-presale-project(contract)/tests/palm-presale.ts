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
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
// import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { BN } from "bn.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

// import Uint8 array from admin.json
import adminSecretArray from "./wallets/admin.json";

// setting the sleeping time function
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("palm-presale", () => {

  // Configure the client to use the devnet cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const connection = new Connection("https://denny-wuerxw-fast-devnet.helius-rpc.com/", "confirmed");
  const program = anchor.workspace.PalmPresale as Program<PalmPresale>;
  const PROGRAM_ID = program.programId;

  // Configure the constants
  const PRESALE_SEED = "PRESALE_SEED";
  const USER_SEED = "USER_SEED";
  const PRESALE_VAULT = "PRESALE_VAULT";

  // set admin
  console.log(adminSecretArray);
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminSecretArray));
  console.log("adminSecretArray displayed.\n");
  const adminPubkey = admin.publicKey;

  // set token buyer
  const buyerWallet = anchor.AnchorProvider.env().wallet;
  const buyer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
  const buyerPubkey = buyerWallet.publicKey;

  // set tokenMint
  let mint: PublicKey;
  let adminAta: PublicKey;
  const tokenDecimal = 9;
  const amount = new BN(1000000000).mul(new BN(10 ** tokenDecimal));

  // presale setting
  const softCapAmount = new BN(300000);
  const hardCapAmount = new BN(500000);
  const maxTokenAmountPerAddress = new BN(1000);
  const pricePerToken = new BN(100);
  // const startTime = new BN(1717497786561);
  let startTime = new BN(Date.now());
  const presaleDuration = new BN(5000);
  let endTime = startTime.add(presaleDuration);

  // deposit setting
  const presaleAmount = new BN(300000000).mul(new BN(10 ** tokenDecimal));

  // buyToken setting
  const quoteSolAmount = new BN(10000);

  // withdraw sol setting
  const withdrawSolAmount = new BN(1);

  // withdraw token setting
  const withdrawTokenAmount = new BN(1);

  // address of userinfo PDA
  const getUserInfoPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED)],
        PROGRAM_ID
      )
    )[0];
  };

  // address of presaleinfo PDA
  const getPresalePDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(PRESALE_SEED)],
        PROGRAM_ID
      )
    );
  };

  // address of presalevault PDA
  const getVaultPDA = async () => {
    return (
      await PublicKey.findProgramAddressSync(
        [Buffer.from(PRESALE_VAULT)],
        PROGRAM_ID
      )
    );
  };

  // it("Airdrop to user wallet", async () => {
  //   console.log("Created admin, address is ", admin.publicKey.toBase58());
  //   console.log(
  //     `Requesting airdrop for admin ${admin.publicKey.toBase58()}`
  //   );
  //   // 1 - Request Airdrop
  //   const signature = await connection.requestAirdrop(admin.publicKey, 10 ** 9);
  //   // 2 - Fetch the latest blockhash
  //   const { blockhash, lastValidBlockHeight } =
  //     await connection.getLatestBlockhash();
  //   // 3 - Confirm transaction success
  //   await connection.confirmTransaction(
  //     {
  //       blockhash,
  //       lastValidBlockHeight,
  //       signature,
  //     },
  //     "finalized"
  //   );
  //   console.log(
  //     "user balance : ",
  //     (await connection.getBalance(admin.publicKey)) / 10 ** 9,
  //     "SOL"
  //   );
  // });

  it("Mint token to admin wallet", async () => {
    console.log("Trying to create and mint token to admin's wallet.");
    console.log("Here, contract uses this token as LP token");
    console.log(
      (await connection.getBalance(adminPubkey)) / LAMPORTS_PER_SOL
    );

    // create mint
    try {
      mint = await createMint(
        connection,
        admin,
        adminPubkey,
        adminPubkey,
        tokenDecimal
      );

      console.log("token mint address: " + mint.toBase58());
      adminAta = (
        await getOrCreateAssociatedTokenAccount(
          connection,
          admin,
          mint,
          adminPubkey
        )
      ).address;
      console.log("Admin associated token account address: " + adminAta.toBase58());

      // minting specific number of new tokens to the adminAta we just created
      await mintTo(
        connection,
        admin,
        mint,
        adminAta,
        adminPubkey,
        BigInt(amount.toString())
      );

      // balance of token in adminAta
      const tokenBalance = await connection.getTokenAccountBalance(adminAta);

      console.log("tokenBalance in adminAta: ", tokenBalance.value.uiAmount);
      console.log("-----token successfully minted!!!-----");
    } catch (error) {
      console.log("-----Token creation error----- \n", error);
    }
  });

  // it("Presale account is initialized!", async () => {

  //   // fetching accounts for transaction
  //   const [presalePDA] = await getPresalePDA();
  //   console.log(`Presale address: ${presalePDA} is created.`);
  //   console.log("Balance of admin wallet: ", await connection.getBalance(adminPubkey));

  //   console.log(`--------${program.programId}-------`);


  //   // preparing transaction
  //   const tx = await program.methods
  //     .createPresale(
  //       mint,
  //       softCapAmount,
  //       hardCapAmount,
  //       maxTokenAmountPerAddress,
  //       pricePerToken,
  //       startTime,
  //       endTime
  //     )
  //     .accounts({
  //       presaleInfo: presalePDA,
  //       authority: adminPubkey,
  //       systemProgram: web3.SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .transaction();

  //   tx.feePayer = admin.publicKey;
  //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  //   console.log("transaction", tx);

  //   // transcation confirmation stage
  //   console.log(await connection.simulateTransaction(tx))
  //   const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
  //   console.log(
  //     `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
  //   );

  //   // test result check
  //   const presaleState = await program.account.presaleInfo.fetch(presalePDA);
  //   console.log("presale state: ", presaleState);
  //   // console.log("presale hard cap: ", presaleState.hardcapAmount.toString());
  // });

  // it("Presale is updated!", async () => {

  //   // fetching accounts for transaction
  //   const [presalePDA] = await getPresalePDA();

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
  //       authority: adminPubkey,
  //       systemProgram: web3.SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .transaction();

  //   tx.feePayer = admin.publicKey;
  //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  //   console.log(await connection.simulateTransaction(tx))

  //   const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
  //   console.log(
  //     `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
  //   );

  //   // test result check
  //   const presaleState = await program.account.presaleInfo.fetch(presalePDA);
  //   console.log("presale state: ", presaleState);
  //   console.log("presale soft cap: ", presaleState.softcapAmount.toString());
  // });

  it("Token is deposited!", async () => {

    // fetching accounts for transaction
    const [presalePDA] = await getPresalePDA();
    const [presaleVault] = await getVaultPDA();

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
        fromAssociatedTokenAccount: adminAta,
        fromAuthority: adminPubkey,
        toAssociatedTokenAccount: toAssociatedTokenAccount,
        presaleVault: presaleVault,
        presaleInfo: presalePDA,
        admin: adminPubkey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    console.log(await connection.simulateTransaction(tx))

    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
    console.log(
      `Transaction succcess: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );
    console.log("Token mint address: ", mint.toBase58());
    console.log(
      "Token balance of presaleAta: ",
      await connection.getTokenAccountBalance(toAssociatedTokenAccount)
    );
    console.log(
      "Sol balance of presale vault: ",
      await connection.getBalance(presaleVault)
    );
  });

  it("Presale start!", async () => {
    // fetching accounts for transaction
    const [presalePDA] = await getPresalePDA();

    startTime = new BN(Date.now());
    endTime = startTime.add(presaleDuration);

    // preparing transaction
    const tx = await program.methods
      .startPresale(startTime, endTime)
      .accounts({
        presaleInfo: presalePDA,
        authority: adminPubkey,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);

    console.log(
      `Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`
    );
    console.log("Start time: ", new Date(parseInt(startTime.toString())), "----", startTime.toNumber());
    console.log("End time: ", new Date(parseInt(endTime.toString())), "----", endTime.toNumber());
  });

  // it("Buy token!", async () => {

  //   await sleep(1000);

  //   const [presalePDA] = await getPresalePDA();
  //   const [presaleVault] = await getVaultPDA();
  //   const tokenAmount = quoteSolAmount.div(pricePerToken);

  //   // get userInfo Address
  //   const userInfo = await getUserInfoPDA();

  //   // preparing transaction
  //   const tx = await program.methods
  //     .buyToken(quoteSolAmount, tokenAmount)
  //     .accounts({
  //       presaleInfo: presalePDA,
  //       presaleAuthority: adminPubkey,
  //       userInfo: userInfo,
  //       presaleVault: presaleVault,
  //       buyer: buyerPubkey,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //       systemProgram: SystemProgram.programId,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  //     })
  //     .signers([buyer.payer])
  //     .transaction();

  //   tx.feePayer = buyerPubkey;
  //   tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  //   console.log(await connection.simulateTransaction(tx))

  //   const signature = await sendAndConfirmTransaction(connection, tx, [
  //     buyer.payer,
  //   ]);

  //   const userState = await program.account.userInfo.fetch(userInfo);
  //   const vaultBalance = await connection.getBalance(presaleVault);

  //   console.log(
  //     `Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`
  //   );
  //   console.log("Presale Vault balance: ", vaultBalance, " address : ", presaleVault);
  //   console.log("User state: ", userState);
  // });

  it("Claim token!", async () => {
    console.log("waiting for some seconds for presale to end")
    await sleep(6000)    // wait for 50 seconds
    const [presalePDA, bump] = await getPresalePDA();

    // get associatedTokenAddress
    const presalePresaleTokenAssociatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      presalePDA,
      true
    );
    console.log("presale ATA: ", presalePresaleTokenAssociatedTokenAccount);
    console.log("token balance: ", await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount));

    const buyerPresaleTokenAssociatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      buyerPubkey,
      true
    )
    console.log("buyer ATA: ", presalePresaleTokenAssociatedTokenAccount);
    console.log("token balance: ", await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount));

    const userInfo = await getUserInfoPDA();
    const [presaleInfo] = await getPresalePDA();

    const tx = await program.methods
      .claimToken(bump)
      .accounts({
        presaleTokenMintAccount: mint,
        buyerPresaleTokenAssociatedTokenAccount: buyerPresaleTokenAssociatedTokenAccount,
        presalePresaleTokenAssociatedTokenAccount: presalePresaleTokenAssociatedTokenAccount,
        userInfo: userInfo,
        presaleInfo: presaleInfo,
        presaleAuthority: adminPubkey,
        buyer: buyerPubkey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([buyer.payer])
      .transaction();

    tx.feePayer = buyerPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    console.log(await connection.simulateTransaction(tx))

    const signature = await sendAndConfirmTransaction(connection, tx, [buyer.payer as Keypair]);

    const presaleTokenBalance = await connection.getTokenAccountBalance(presalePresaleTokenAssociatedTokenAccount);
    const buyerTokenBalance = await connection.getTokenAccountBalance(buyerPresaleTokenAssociatedTokenAccount);

    console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);

    console.log("The balance of the token of the presale: ", presaleTokenBalance);
    console.log("The balance of the token of the user: ", buyerTokenBalance);
  })

  it("Withdraw token!", async () => {

    const [presalePDA, bump] = await getPresalePDA();

    const presaleAssociatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      presalePDA,
      true
    );

    const tx = await program.methods
      .withdrawToken(withdrawTokenAmount, bump)
      .accounts({
        mintAccount: mint,
        adminAssociatedTokenAccount: adminAta,
        presaleAssociatedTokenAccount: presaleAssociatedTokenAccount,
        presaleTokenMintAccount: mint,
        presaleInfo: presalePDA,
        // presaleAuthority: adminPubkey,
        adminAuthority: adminPubkey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = adminPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [admin as Keypair]);

    const presaleTokenBalance = await connection.getTokenAccountBalance(presaleAssociatedTokenAccount);
    const adminTokenBalance = await connection.getTokenAccountBalance(adminAta);

    console.log("The token balance of the presale vault: ", presaleTokenBalance);
    console.log("The token balance of the admin: ", adminTokenBalance);
  })

  it("Withdraw sol!", async () => {
    const [presalePDA] = await getPresalePDA();
    const [presaleVault, bump] = await getVaultPDA();

    const tx = await program.methods
      .withdrawSol(withdrawSolAmount, bump)
      .accounts({
        presaleInfo: presalePDA,
        presaleVault: presaleVault,
        admin: adminPubkey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([admin])
      .transaction();

    tx.feePayer = admin.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    console.log(await connection.simulateTransaction(tx));
    
    // console.log(JSON.stringify(tx));
    const signature = await sendAndConfirmTransaction(connection, tx, [admin]);
    
    console.log(`Transaction success: \n https://solscan.io/tx/${signature}?cluster=devnet`);

    const vaultBalance = await connection.getBalance(presaleVault);
    const adminBalance = await connection.getBalance(admin.publicKey);

    console.log("The balance of the presale vault: ", vaultBalance);
    console.log("The balance of the admin: ", adminBalance);
  })
});

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");

describe("KittyCore & SaleClockAuction", () => {
    async function deployKittyCore() {
        const Signers = await ethers.getSigners();
        const KittyCoreContract = await ethers.getContractFactory("KittyCore");
        const KittyCore = await KittyCoreContract.deploy();

        return { KittyCore, Signers };
    }

    async function deploySaleClockAuction() {
        const cut = 375;
        const SaleClockAuctionContract = await ethers.getContractFactory(
            "SaleClockAuction"
        );
        const SaleClockAuction = await SaleClockAuctionContract.deploy(
            kittyCore.address,
            cut
        );

        return { SaleClockAuction };
    }

    let kittyCore;
    let saleClockAuction;
    let signers;

    before(async () => {
        const { KittyCore, Signers } = await loadFixture(deployKittyCore);
        kittyCore = KittyCore;
        signers = Signers;
        console.log(`signers: ${JSON.stringify(signers)}`);

        await kittyCore.setCFO(signers[1].address);

        const { SaleClockAuction } = await loadFixture(deploySaleClockAuction);
        saleClockAuction = SaleClockAuction;

        await kittyCore.setSaleAuctionAddress(saleClockAuction.address);

        console.log(
            `KittyCore: ${kittyCore.address}, SaleClockAuction: ${saleClockAuction.address}`
        );
    });

    describe("KittyCore Contructor", () => {
        it("KittyAccessControl Values Check", async () => {
            const ceo = await kittyCore.ceoAddress();
            const cfo = await kittyCore.cfoAddress();
            const coo = await kittyCore.cooAddress();

            console.log(`ceo: ${ceo}, cfo: ${cfo}, coo: ${coo}`);

            expect(ceo).to.equal(signers[0].address);
            expect(cfo).to.equal(signers[1].address);
            expect(coo).to.equal(signers[0].address);
        });

        it("KittyBase Constructor", async () => {
            const name = await kittyCore.name();
            const symbol = await kittyCore.symbol();
            console.log(`name: ${name}, symbol: ${symbol}`);

            expect(name).to.equal("CryptoKitties");
            expect(symbol).to.equal("CK");
        });

        it("KittyAuction values check", async () => {
            const saleAuction = await kittyCore.saleAuction();
            console.log(`saleAuction: ${saleAuction}`);

            expect(saleAuction).to.equal(saleClockAuction.address);
        });

        it("KittyMinting values check", async () => {
            const promoKittyCount = await kittyCore.promoCreatedCount();
            const gen0KittyCount = await kittyCore.gen0CreatedCount();
            console.log(
                `promo kitty count: ${promoKittyCount}, gen0 kitty count: ${gen0KittyCount}`
            );

            expect(promoKittyCount).to.equal(0);
            expect(gen0KittyCount).to.equal(0);
        });

        it("KittyCore Contructor", async () => {
            const paused = await kittyCore.paused();
            console.log(`paused: ${paused}`);
            expect(paused).to.equal(true);

            const zeroKitty = await kittyCore.getKitty(0);
            console.log(`zeroKitty:`, zeroKitty);
        });
    });

    describe("ClokAuction Contructor", () => {
        it("ClockAuction Contructor", async () => {
            const nonFungibleContract =
                await saleClockAuction.nonFungibleContract();
            console.log("nonFungibleContract");
            expect(nonFungibleContract).to.equal(kittyCore.address);
        });
    });

    describe("KittyMinting", () => {
        it.skip("Minting Gen0 Kitty should revert if onERC721Received() is not implemented at KittyCore", async () => {
            const genes =
                "626837621154801616088980922659877168609154386318304496692374110716999053";
            await expect(kittyCore.createGen0Auction(genes)).to.be.revertedWith(
                "ERC721: transfer to non ERC721Receiver implementer"
            );
        });

        it.skip("Creating gen0 sale auction should revert if it's not approved to sale auction", async () => {
            const genes =
                "626837621154801616088980922659877168609154386318304496692374110716999053";
            await expect(kittyCore.createGen0Auction(genes)).to.be.revertedWith(
                "ERC721: caller is not token owner or approved"
            );
        });

        it("Mint Gen0 Kitty", async () => {
            let gen0CreatedCount = await kittyCore.gen0CreatedCount();
            expect(gen0CreatedCount).to.equal(0);

            const genes =
                "626837621154801616088980922659877168609154386318304496692374110716999053";

            await kittyCore.createGen0Auction(genes);
            gen0CreatedCount = await kittyCore.gen0CreatedCount();
            expect(gen0CreatedCount).to.equal(1);

            const token1price = await saleClockAuction.getCurrentPrice(1);
            console.log(
                `tokenId 1 current price: ${token1price / 10 ** 18} ETH`
            );
        });

        it("Gen0 Kitty's current price should be halved when time passed half to expiration", async () => {
            console.log(">>> before time passed half day");

            const token1price_before = await saleClockAuction.getCurrentPrice(
                1
            );
            console.log(`tokenId 1 current price: ${token1price_before}`);

            console.log(`43200 to hex: ${ethers.utils.hexlify(43200)}`);
            await network.provider.send("hardhat_mine", [
                `${ethers.utils.hexlify(43200)}`,
            ]);

            console.log(">>> after time passed half day");
            const token1price_after = await saleClockAuction.getCurrentPrice(1);
            console.log(`tokenId 1 current price: ${token1price_after}`);
        });
    });

    describe("SaleClockAuction", () => {
        it("should revert when send ETH", async () => {
            await expect(
                signers[0].sendTransaction({
                    to: saleClockAuction.address,
                    value: ethers.utils.parseEther("1"),
                })
            ).to.be.reverted;
        });

        it("Contructor", async () => {
            const owner = await saleClockAuction.owner();
            console.log(`owner: ${owner}`);

            expect(owner).to.equal(signers[0].address);
        });

        it("bid gen0 1", async () => {
            console.log(">>> before bid");

            const kittyCore_balance_before = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(
                `kittyCore balance before: ${kittyCore_balance_before}`
            );

            const currentPrice = await saleClockAuction.getCurrentPrice(1);
            console.log(`tokenId 1's current price: ${currentPrice}`);

            let gen0SaleCount = await saleClockAuction.gen0SaleCount();
            console.log(`gen0SaleCount: ${gen0SaleCount}`);

            for (let i = 0; i < 5; i++) {
                let lastGen0SalePrice =
                    await saleClockAuction.lastGen0SalePrices(i);
                console.log(`lastGen0SalePrice[${i}]: ${lastGen0SalePrice}`);
            }

            expect(gen0SaleCount).to.equal(0);

            let token1owner = await kittyCore.ownerOf(1);
            console.log(`tokenId 1's owner: ${token1owner}`);
            expect(token1owner).to.equal(saleClockAuction.address);

            console.log(">>> after bid");

            await saleClockAuction
                .connect(signers[2])
                .bid(1, { value: currentPrice });

            const kittyCore_balance_after = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`kittyCore balance after: ${kittyCore_balance_after}`);

            const saleClockAuction_balance_after =
                await ethers.provider.getBalance(saleClockAuction.address);
            console.log(
                `SaleClockAuction balace: ${saleClockAuction_balance_after}`
            );

            gen0SaleCount = await saleClockAuction.gen0SaleCount();
            console.log(`gen0SaleCount: ${gen0SaleCount}`);
            for (let i = 0; i < 5; i++) {
                let lastGen0SalePrice =
                    await saleClockAuction.lastGen0SalePrices(i);
                console.log(`lastGen0SalePrice[${i}]: ${lastGen0SalePrice}`);
            }
            expect(gen0SaleCount).to.equal(1);

            token1owner = await kittyCore.ownerOf(1);
            console.log(`tokenId 1 owner: ${token1owner}`);
            expect(token1owner).to.equal(signers[2].address);
        });

        it("bid gen0 2", async () => {
            console.log(">>> createGen0Auction");

            const genes =
                "623332824742417442073801652020554010523726975553705023219600667807529387";

            await kittyCore.createGen0Auction(genes);

            let gen0CreatedCount = await kittyCore.gen0CreatedCount();
            expect(gen0CreatedCount).to.equal(2);

            const token2price = await saleClockAuction.getCurrentPrice(2);
            console.log(`tokenId 2's current price: ${token2price}`);

            console.log(">>> before bid");

            const kittyCore_balance_before = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(
                `kittyCore balance before: ${kittyCore_balance_before}`
            );

            const saleClockAuction_balance_before =
                await ethers.provider.getBalance(saleClockAuction.address);
            console.log(
                `saleClockAuction balance before: ${saleClockAuction_balance_before}`
            );

            let gen0SaleCount = await saleClockAuction.gen0SaleCount();
            console.log(`gen0SaleCount: ${gen0SaleCount}`);

            for (let i = 0; i < 5; i++) {
                let lastGen0SalePrice =
                    await saleClockAuction.lastGen0SalePrices(i);
                console.log(`lastGen0SalePrice[${i}]: ${lastGen0SalePrice}`);
            }

            expect(gen0SaleCount).to.equal(1);

            let token2owner = await kittyCore.ownerOf(2);
            console.log(`tokenId 2's owner: ${token2owner}`);
            expect(token2owner).to.equal(saleClockAuction.address);

            console.log(">>> after bid");

            await saleClockAuction
                .connect(signers[2])
                .bid(2, { value: token2price });

            const kittyCore_balance_after = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`kittyCore balance after: ${kittyCore_balance_after}`);

            const saleClockAuction_balance_after =
                await ethers.provider.getBalance(saleClockAuction.address);
            console.log(
                `SaleClockAuction balace after: ${saleClockAuction_balance_after}`
            );

            gen0SaleCount = await saleClockAuction.gen0SaleCount();
            console.log(`gen0SaleCount: ${gen0SaleCount}`);
            for (let i = 0; i < 5; i++) {
                let lastGen0SalePrice =
                    await saleClockAuction.lastGen0SalePrices(i);
                console.log(`lastGen0SalePrice[${i}]: ${lastGen0SalePrice}`);
            }
            expect(gen0SaleCount).to.equal(2);

            token2owner = await kittyCore.ownerOf(2);
            console.log(`tokenId 2's owner: ${token2owner}`);
            expect(token2owner).to.equal(signers[2].address);
        });

        it("createAuction should gail if it's not called by nonFungibleContract(KittyCore)", async () => {
            const genes = 1;
            await kittyCore.createPromoKitty(genes, signers[2].address);

            const startingPrice = ethers.utils.parseEther("0.01");
            const endingPrice = ethers.utils.parseEther("0.005");
            const oneDay = 86400;
            await expect(
                saleClockAuction
                    .connect(signers[2])
                    .createAuction(
                        3,
                        startingPrice,
                        endingPrice,
                        oneDay,
                        signers[2].address
                    )
            ).to.be.rejectedWith("you're not the NFcontract");
        });
    });

    describe("User Create Auction", () => {
        it("Should revert if user tries to createAuction when contract is paused", async () => {
            const startingPrice = ethers.utils.parseEther("0.2");
            const endingPrice = ethers.utils.parseEther("0.05");
            const duration = 43200;
            await expect(
                kittyCore
                    .connect(signers[2])
                    .createSaleAuction(1, startingPrice, endingPrice, duration)
            ).to.be.rejectedWith("Pausable: paused");
        });

        it("User create auction correctly", async () => {
            console.log(">>> before createSaleAuction by signer 2");

            await kittyCore.unpause();

            const paused = await kittyCore.paused();
            console.log(`paused: ${paused}`);

            expect(paused).to.equal(false);

            const startingPrice = ethers.utils.parseEther("0.2");
            const endingPrice = ethers.utils.parseEther("0.05");
            const duration = 43200;

            await kittyCore
                .connect(signers[2])
                .createSaleAuction(1, startingPrice, endingPrice, duration);

            console.log(">>> after createSaleAuction by signer 2");

            const auction1 = await saleClockAuction.getAuction(1);
            console.log(`auction 1:`, auction1);
        });

        it("bid by signer 3", async () => {
            const kittyCore_balance_before = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(
                `kittyCore balance before: ${kittyCore_balance_before}`
            );

            const saleClockAuction_balance_before =
                await ethers.provider.getBalance(saleClockAuction.address);
            console.log(
                `saleClockAuction balance before: ${saleClockAuction_balance_before}`
            );

            const currentPrice = await saleClockAuction.getCurrentPrice(1);
            console.log(`tokenId 1's current price: ${currentPrice}`);

            let token1owner = await kittyCore.ownerOf(1);
            console.log(`token 1's owner: ${token1owner}`);
            expect(token1owner).to.equal(saleClockAuction.address);

            const signer2_balance_before = await ethers.provider.getBalance(
                signers[2].address
            );
            console.log(`signer 2 balance before: ${signer2_balance_before}`);
            const signer3_balance_before = await ethers.provider.getBalance(
                signers[3].address
            );
            console.log(`signer 3 balance before: ${signer3_balance_before}`);

            console.log(">>> after bid");

            await saleClockAuction
                .connect(signers[3])
                .bid(1, { value: currentPrice });

            const kittyCore_balance_after = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`KittyCore balance: ${kittyCore_balance_after}`);

            const saleClockAuction_after = await ethers.provider.getBalance(
                saleClockAuction.address
            );
            console.log(`SaleClockAuction balance: ${saleClockAuction_after}`);

            token1owner = await kittyCore.ownerOf(1);
            console.log(`tokenId 1's owner: ${token1owner}`);
            expect(token1owner).to.equal(signers[3].address);

            const signer2_balance_after = await ethers.provider.getBalance(
                signers[2].address
            );
            console.log(`signer 2 balance after: ${signer2_balance_after}`);
            const signer3_balance_after = await ethers.provider.getBalance(
                signers[3].address
            );
            console.log(`signer 3 balance after: ${signer3_balance_after}`);

            console.log(
                `signer2 balance diff: ${signer2_balance_after.sub(
                    signer2_balance_before
                )}`
            );
        });
    });

    describe("CancelAuction", () => {
        it("Should revert if the tokenId is not on the auction", async () => {
            await expect(
                saleClockAuction.connect(signers[3]).cancelAuction(1)
            ).to.be.revertedWith("this _tokenId in not on the auction");
        });

        it("Should revert if tired to cancel by non seller", async () => {
            const startingPrice = ethers.utils.parseEther("0.7");
            const endingPrice = ethers.utils.parseEther("0.3");
            const duration = 43200;

            await kittyCore
                .connect(signers[3])
                .createSaleAuction(1, startingPrice, endingPrice, duration);

            const auction1 = await saleClockAuction.getAuction(1);
            console.log(`auction:`, auction1);

            await expect(saleClockAuction.cancelAuction(1)).to.be.revertedWith(
                "you're not the seller"
            );
        });
        it("CancelAuction correctly", async () => {
            let auction1 = await saleClockAuction.getAuction(1);
            console.log(`auction1:`, auction1);

            let token1owner = await kittyCore.ownerOf(1);
            console.log(`token 1 owner: ${token1owner}`);
            expect(token1owner).to.equal(saleClockAuction.address);

            console.log(">>> cancel sale auction");

            await saleClockAuction.connect(signers[3]).cancelAuction(1);

            token1owner = await kittyCore.ownerOf(1);
            console.log(`token 1 owner: ${token1owner}`);
            expect(token1owner).to.equal(signers[3].address);
        });
    });

    describe("withdrawbalance", () => {
        it("withdraw balance from SaleClockAuction to KittyCore", async () => {
            console.log(">>> before withdrawBalance");

            const kittyCore_balance_before = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`KittyCore balance: ${kittyCore_balance_before}`);
            const saleClockAuction_before = await ethers.provider.getBalance(
                saleClockAuction.address
            );
            console.log(`SaleClockAuction balance: ${saleClockAuction_before}`);

            console.log(">>> withdraw balance from SaleClockAuction");

            await kittyCore.withdrawAuctionBalances();

            const kittyCore_balance_after = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`KittyCore balance: ${kittyCore_balance_after}`);
            const saleClockAuction_after = await ethers.provider.getBalance(
                saleClockAuction.address
            );
            console.log(`SaleClockAuction balance: ${saleClockAuction_after}`);

            expect(saleClockAuction_after).to.equal(0);
            expect(
                kittyCore_balance_after.sub(kittyCore_balance_before)
            ).to.equal(saleClockAuction_before);
        });

        it("Withdraw balance from KittyCore to CFO", async () => {
            console.log(">>> before withdraw balance from KittyCore");

            const cfo = await kittyCore.cfoAddress();

            const kittyCore_balance_before = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(
                `KittyCore balance before: ${kittyCore_balance_before}`
            );
            const cfo_balance_before = await ethers.provider.getBalance(cfo);
            console.log(`cfo balance before: ${cfo_balance_before}`);

            console.log(">>> after withdraw balance from KittyCore");

            await kittyCore.connect(signers[1]).withdrawBalance();

            const kittyCore_balance_after = await ethers.provider.getBalance(
                kittyCore.address
            );
            console.log(`KittyCore balance after: ${kittyCore_balance_after}`);
            const cfo_balance_after = await ethers.provider.getBalance(cfo);
            console.log(`cfo balance after: ${cfo_balance_after}`);

            console.log(
                `KittyCore balance diff: ${kittyCore_balance_after.sub(
                    kittyCore_balance_before
                )}`
            );
            console.log(
                `CFO balance diff: ${cfo_balance_after.sub(cfo_balance_before)}`
            );
        });
    });
});

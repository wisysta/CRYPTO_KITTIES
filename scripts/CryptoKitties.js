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
    });
});

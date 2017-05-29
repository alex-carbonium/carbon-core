import tinycolor from "tinycolor2";

const imageDataStep = 4;

export function getAverageLuminance(imageData){
    let sum = 0;
    let count = 0;

    for (let i = 0; i < imageData.width; ++i){
        for (let j = 0; j < imageData.height; ++j){
            let index = i*j*imageDataStep*imageDataStep + i*imageDataStep;
            if (index >= 0 && index < imageData.data.length){
                let c = tinycolor({
                    r: imageData.data[index],
                    g: imageData.data[index + 1],
                    b: imageData.data[index + 2],
                    a: imageData.data[index + 3]
                });
                sum += c['getLuminance'](); //official api, but not present in types
                count += 1;
            }
        }
    }

    return count > 0 ? sum/count : -1;
}
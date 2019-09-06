/**
 * @file Transform COPYBOOK (COBOL) to JSON.
 * @author @douglaspands
 * @since 2017-10-25
 * @adapted 2019-09-05
 */

 // Module
 const copyBook2Json = require('./CopyBook2Json.js');
 // Instance
 const translator = new copyBook2Json('src/EXAMPLE.cbl');
 
 function printLevels(json) {
    json.forEach( prop => {
        if( prop.data ) {
            console.log( 'GROUP: ', prop.name );
            printLevels( prop.data );
        } else {
            console.log( prop );
        }
    })
 }

 console.log('Start');
 // Process...
 let json = translator.process();
 console.log('String json is: ' , json );

 if(json) {
    // Make object
    json = JSON.parse(json);
    // Print object
    console.log('Made object is:' , json );
    // Print recurring levels
    console.log('Recurrently, the object is:');
    printLevels( json );
 }
 console.log('End');



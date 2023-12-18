import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/system';
import ShowImage from './ShowImage';
import { Link } from 'react-router-dom'; 
import Form1 from './Form1';
import Edit from './edidata';
import AWS from 'aws-sdk';
import { openDB } from 'idb';


const minioEndpoint = 'http://10.8.0.13:9000';
const accessKey = 'minioadmin';
const secretKey = 'minioadmin';
const bucketName = 'test';

AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretKey,
  endpoint: minioEndpoint,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const s3 = new AWS.S3();

const minioUploader = async (file, fileName) => {
  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: file,
    ContentType: file.type,
  };

  try {
    await s3.upload(params).promise();
  } catch (error) {
    console.error('Error uploading to MinIO:', error);
    throw error;
  }
};

// ...

// Define the database name, version, and upgrade callback
const dbPromise = openDB('deletedMedicalFormsDB', 1, {
  upgrade(db) {
    db.createObjectStore('deletedMedicalForms', { keyPath: 'id', autoIncrement: true });
  },
});

// ...

const handleClear = () => {
  let records; // Define records outside the scope

  openDB('medicalFormDB', 1)
    .then(db1 => {
      const originalTransaction = db1.transaction('medicalForms', 'readwrite');
      const originalObjectStore = originalTransaction.objectStore('medicalForms');
      return originalObjectStore.getAll();
    })
    .then(retrievedRecords => {
      records = retrievedRecords; // Assign the retrieved records to the variable
      return openDB('medicalFormDB', 1);
    })
    .then(db => {
      const clearTransaction = db.transaction('medicalForms', 'readwrite');
      const clearObjectStore = clearTransaction.objectStore('medicalForms');
      clearObjectStore.clear();
      return openDB('deletedMedicalFormsDB', 1);
    })
    .then(db1 => {
      const addTransaction = db1.transaction('deletedMedicalForms', 'readwrite');
      const addObjectStore = addTransaction.objectStore('deletedMedicalForms');
      records.forEach(record => addObjectStore.add(record));

      console.log('Records cleared and moved to deletedmedicalforms');
    })
    .catch(error => {
      console.error('Error clearing records:', error);
    });
};

     


const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));
// Main component for displaying medical records table
const MedicalRecordsTable = ({ medicalRecords, onAddClick, onSearch, setMedicalRecords }) => {
  const [open, setOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [open1,setOpen1]=useState(false)
  const [ids,setIDs]=useState('')

   // Function to handle opening edit dialog
  const handleOpen1=(id)=>{
   
    setIDs(id)
    setOpen1(true)
  };

 // Function to handle closing edit dialog
  const handleclose1=()=>{
    setOpen1(false)
  }

  // Function to handle opening image dialog
  const handleClickOpen = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setOpen(true);
  };
  const dialogStyle = {
    overflowX: 'hidden', // Hide the horizontal scrollbar
  };


// Function to handle closing image dialog
  const handleClose = () => {
    setOpen(false);
  };


  // Function to handle edit action
  const handleEdit = (id) => {
    // Add logic for handling edit action
    console.log(`Edit button clicked for entry with id: ${id}`);
  };

  const handleDelete = async (id) => {
    try {
      if (navigator.onLine) {
        // Online: Send a DELETE request to the server
        await axios.delete(`http://localhost:5000/deleteMedicalData/${id}`);
  
        // Update the state to remove the deleted record
        setMedicalRecords(medicalRecords.filter(entry => entry._id !== id));
  
        console.log(`Medical record with id ${id} deleted successfully`);
      } else {
        // Offline: Store the deleted record in a separate store in IndexedDB
        console.log('hi')
        console.log('Deleting record with id:', id);
  
        // Open the original object store ("medicalForms") and delete the record
        const db1 = await openDB('medicalFormDB', 1);
        const originalTransaction = db1.transaction('medicalForms', 'readwrite');
        const originalObjectStore = originalTransaction.objectStore('medicalForms');


        await originalObjectStore.delete(id);
        console.log('Deleted record from original object store with id:', id);
        console.log('Transaction done:', await originalTransaction.done);
        const deletedRecord = medicalRecords.find(entry => entry._id === id);

        const db = await dbPromise
  
        // Store the deleted record in the new object store ("deletedMedicalForms")
        const deletedTransaction = db.transaction('deletedMedicalForms', 'readwrite');
        const deletedObjectStore = deletedTransaction.objectStore('deletedMedicalForms');

       // Check if the record with the given key already exists
        const existingRecord = await deletedObjectStore.get(id);
        window.location.reload();

// Add the record only if it doesn't already exist
if (!existingRecord) {
  await deletedObjectStore.add(deletedRecord);
  console.log('added');
} else {
  console.log('Record with this ID already exists in deletedMedicalForms object store');
}

  
  
        // Wait for the transaction to complete
        await deletedTransaction.done;
       
        // Log the server response
        console.log(`Medical record with id ${id} deleted`);
      }
  
      // Attempt to sync with the server
      // await checkConnectivityAndSync();

  
      console.log('After attempting to delete');
      window.location.reload();
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };
  




  // Function to sync deleted records with the server
  // const syncDeletedRecords = async () => {
  //   const db = await openDB('deletedMedicalFormsDB', 1);
  //   const tx = db.transaction('deletedMedicalForms', 'readwrite');
  //   const deletedObjectStore = tx.objectStore('deletedMedicalForms');
  
  //   try {
  //     const deletedRecordsBeforeSync = await deletedObjectStore.getAll();
  //     console.log('Deleted records before sync:', deletedRecordsBeforeSync);
  
  //     // Loop through deleted records and check if they exist in MongoDB
  //     for (const { data, file, _id } of deletedRecordsBeforeSync) {
  //       try {
  //         const existingFormData = await axios.get(`http://localhost:5000/medicalForm/${_id}`);
  
  //         // If the GET request is successful, the medical form exists, and you can skip data synchronization
  //         console.log(`Data with id ${_id} already exists. Skipping data sync.`);
  //       } catch (error) {
  //         // If the GET request fails with a 404 error, proceed to sync the data
  //         if (error.response && error.response.status === 404) {
  //           let fileUrl = '';
  
  //           if (file) {
  //             // Upload new file and get the file URL
  //             const fileName = `medical_form_${Date.now()}_${file.name}`;
  //             await minioUploader(file, fileName);
  //             fileUrl = `${minioEndpoint}/${bucketName}/${fileName}`;
  //           }
  
  //           // Create new entry
  //           const syncResponse = await axios.post('http://localhost:5000/medicalForm', {
  //             ...data, // Assuming "data" is the form data
  //             id: _id,
  //             fileUrl,
  //           });
  
  //           console.log('Data synced to MongoDB:', syncResponse.data);
  //           await tx.complete;
  
  //     const updatedTx = db.transaction('deletedMedicalForms', 'readwrite');
  //     const updatedDeletedObjectStore = updatedTx.objectStore('deletedMedicalForms');
  //     await updatedDeletedObjectStore.clear();
  //     const deletedRecordsAfterSync = await updatedDeletedObjectStore.getAll();
  //     console.log('Deleted records after sync:', deletedRecordsAfterSync);
  
  //     console.log('Local deleted records cleared after successful sync');
  //         } else {
  //           // Handle other errors (not 404) as needed
  //           throw error;
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error syncing data to MongoDB:', error);
  //   }
  // };
  
  
  

// Function to check connectivity and trigger sync if online
// const checkConnectivityAndSync = async () => {
//   try {
//     if (navigator.onLine) {
//       // If online, sync deleted records with the server
      
//       await syncDeletedRecords();
      
//       //await syncDataToMongoDB();
//     }
//   } catch (error) {
//     console.error('Error checking connectivity and syncing:', error);
//   }
// };

// // Call this function whenever the application is online
// // For example, you can call it when the application starts or when it detects a change in network status.
// checkConnectivityAndSync();

  
  return (
    <Paper elevation={3} style={{ padding: '2%', marginBottom: '2%', overflowX: 'auto' }}>
      <Toolbar style={{ flexWrap: 'wrap' }}>
        <TextField
          id="search"
          label="Search"
          type="search"
          variant="outlined"
          size="small"
          style={{ width: '100%', marginBottom: '8px' }}
          onChange={(e) => onSearch(e.target.value)}
        />
        <IconButton
          type="submit"
          aria-label="search"
          style={{ '@media (maxWidth: 600px)': { display: 'none' } }}
 
        >
          <SearchIcon />
        </IconButton>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Link to="/Form1" style={{ textDecoration: 'none' }}>
          <Button variant="contained" color="primary" style={{ width: '100%' }}>
            Add Data
          </Button>
        </Link>
      </div>
      <div style={{ position: 'absolute', top: '45px', right: 0, padding: '10px' }}>
      {!isOnline && (
        <button
          variant="contained"
          color="primary"
          style={{ width: '100%' }}
          onClick={handleClear}
        >
          Clear
        </button>
      )}
      {/* <p>{isOnline ? 'Online' : 'Offline'}</p> */}
      {/* Other content of your component */}
    </div>
      </Toolbar>
      <TableContainer >
        <Table style={{ tableLayout: 'auto' }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>BMI</TableCell>
              <TableCell>Disease</TableCell>
              <TableCell>Submitted Date</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
          {medicalRecords.map((entry, index) => (
          <TableRow key={entry.data ? entry.data._id?.['$oid'] : entry._id?.['$oid']} style={{ fontWeight: index === 0 ? 'bold' : 'normal' }}>
            <TableCell>{`${entry.data ? entry.data.firstName : entry.firstName} ${entry.data ? entry.data.lastName : entry.lastName}`}</TableCell>
            <TableCell>{entry.data ? entry.data.email : entry.email}</TableCell>
            <TableCell>{entry.data ? calculateAge(entry.data.dob) : calculateAge(entry.dob)}</TableCell>
            <TableCell>{entry.data ? entry.data.phoneNumber : entry.phoneNumber}</TableCell>
            <TableCell>{entry.data ? entry.data.bmi : entry.bmi}</TableCell>
            <TableCell>{entry.data ? (entry.data.disease ? entry.data.disease.join(' ') : '') : (entry.disease ? entry.disease.join(' ') : '')}</TableCell>
            <TableCell>
            <TableCell>
            {/* {entry.data && (entry.data.createdAt && entry.data.createdAt.$date || entry.data.timestamp)
  ? new Date(entry.data.createdAt && entry.data.createdAt.$date || entry.data.timestamp).toLocaleString()
  : (entry.createdAt && entry.createdAt.$date
    ? new Date(entry.createdAt.$date).toLocaleString()
    : '')
} */}
{
  // (entry.data && (entry.data.createdAt && entry.data.createdAt.$date || entry.data.timestamp) ||
  //   (!entry.data && entry.timestamp))
  //   ? new Date((entry.data && entry.data.createdAt && entry.data.createdAt.$date) || entry.timestamp).toLocaleString()
  //   : (entry.createdAt && entry.createdAt.$date
  //     ? new Date(entry.createdAt.$date).toLocaleString()
  //     : '')
  
    (entry.data &&
      (entry.data.createdAt && entry.data.createdAt.$date ||
        (entry.data.timestamp && !isNaN(entry.data.timestamp))
          ? new Date(entry.data.createdAt && entry.data.createdAt.$date || entry.data.timestamp).toLocaleString()
          : 'Invalid Date for entry.data.timestamp'
      )
    ) ||
    (!entry.data && entry.timestamp && !isNaN(entry.timestamp)
      ? new Date(entry.timestamp).toLocaleString()
      : (entry.createdAt && entry.createdAt.$date
        ? new Date(entry.createdAt.$date).toLocaleString()
        : 'Invalid Date')
    )
  
  
   
    
  
  
}


</TableCell>

            </TableCell>
                
                <TableCell>
                  <React.Fragment>
                    <Button variant="outlined" onClick={() => handleClickOpen(entry.fileUrl)}>
                      SHOW IMAGE
                    </Button>
                    <BootstrapDialog
                      onClose={handleClose}
                      aria-labelledby="customized-dialog-title"
                      open={open}
                    >
                      <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
                        Modal title
                      </DialogTitle>
                      <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: 8,
                          color: (theme) => theme.palette.grey[500],
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" responsive>
                        <ShowImage imageUrl={selectedImageUrl} open={open} handleClose={handleClose} />
                      </Dialog> 
                      <DialogActions>
                        <Button autoFocus onClick={handleClose}>
                          Save changes
                        </Button>
                      </DialogActions>
                    </BootstrapDialog>
                  </React.Fragment>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex' }}>
                    
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        if (navigator.onLine) {
                          handleOpen1(entry._id['$oid']);
                        } else {
                          handleOpen1(entry._id);
                        }
                      }}
                      
                      startIcon={<EditNoteIcon />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        if (navigator.onLine) {
                          handleDelete(entry._id['$oid']);
                        } else {
                          handleDelete(entry._id);
                        }
                      }}
                      startIcon={<DeleteIcon />}
                      style={{ marginLeft: '8px' }}
                    >
                      Delete
                    </Button>
                  </div>

                  <Dialog open={open1} onClose={handleclose1} fullWidth maxWidth="md" PaperProps={{ style: { marginTop: '-10px' } }}  style={dialogStyle}>
  <DialogContent>
    <Edit id={ids} />
  </DialogContent>
</Dialog>
                 
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
     
    </Paper>
  );
};

const GetData = (props) => {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const existingDataId=props.existingDataId
  const updatedData=props.updatedData
  console.log("dfgh",existingDataId);

  
  
  const [newData, setNewData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    phoneNumber: '',
    bmi: '',
    disease: '',
    fileUrl: '',
  });


  const syncDeletedRecords = async () => {
    const db = await openDB('deletedMedicalFormsDB', 1);
    const tx = db.transaction('deletedMedicalForms', 'readwrite');
    const deletedObjectStore = tx.objectStore('deletedMedicalForms');
  
    try {
      const deletedRecordsBeforeSync = await deletedObjectStore.getAll();
      console.log('Deleted records before sync:', deletedRecordsBeforeSync);
  
      // Loop through deleted records and check if they exist in MongoDB
      for (const { data, file, _id } of deletedRecordsBeforeSync) {
        try {
          const existingFormData = await axios.get(`http://localhost:5000/medicalForm/${_id}`);
  
          // If the GET request is successful, the medical form exists, and you can skip data synchronization
          console.log(`Data with id ${_id} already exists. Skipping data sync.`);
        } catch (error) {
          // If the GET request fails with a 404 error, proceed to sync the data
          if (error.response && error.response.status === 404) {
            let fileUrl = '';
  
            if (file) {
              // Upload new file and get the file URL
              const fileName = `medical_form_${Date.now()}_${file.name}`;
              await minioUploader(file, fileName);
              fileUrl = `${minioEndpoint}/${bucketName}/${fileName}`;
            }
  
            // Create new entry
            const syncResponse = await axios.post('http://localhost:5000/medicalForm', {
              ...data, // Assuming "data" is the form data
              id: _id,
              fileUrl,
            });
  
            console.log('Data synced to MongoDB:', syncResponse.data);
            await tx.complete;
  
      const updatedTx = db.transaction('deletedMedicalForms', 'readwrite');
      const updatedDeletedObjectStore = updatedTx.objectStore('deletedMedicalForms');
      await updatedDeletedObjectStore.clear();
      const deletedRecordsAfterSync = await updatedDeletedObjectStore.getAll();
      console.log('Deleted records after sync:', deletedRecordsAfterSync);
  
      console.log('Local deleted records cleared after successful sync');
          } else {
            // Handle other errors (not 404) as needed
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error syncing data to MongoDB:', error);
    }
  };
  
  
  

  useEffect(() => {
    console.log('Entering useEffect');
    const fetchData = async () => {
      try {
        if (navigator.onLine) {
          console.log('Before axios.get');
          await syncDeletedRecords();



          const response = await axios.get('http://localhost:5000/getMedicalData');
          console.log('After axios.get', response);
          setMedicalRecords(response.data);

          // Update data in IndexedDB
          // const db = await openDB('medicalFormDB', 1);
          // const tx = db.transaction('medicalForms', 'readwrite');
          // const store = tx.objectStore('medicalForms');

          // // Clear existing data and add new data
          // await store.clear();
          // response.data.forEach(async (record) => {
          //   await store.add({ id: record._id['$oid'], data: record });
          // });
        } else {
          // Fetch data from IndexedDB when offline
          const db = await openDB('medicalFormDB', 1);
          const indexedDBRecords = await db.getAll('medicalForms');
          setMedicalRecords(indexedDBRecords);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    console.log('Calling fetchData');
    fetchData();
    return () => {
      console.log('Cleanup useEffect');
    };
  }, []);

  
  
  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/searchMedicalData?term=${searchTerm}`);
      setMedicalRecords(response.data);
    } catch (error) {
      console.error('Error searching data:', error);
    }
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };


  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" style={{ flexGrow: 1, fontSize: '1.5rem','@media (max-width: 600px)': { fontSize: '1rem' } }}>
            Medical Records
          </Typography>
        </Toolbar>
      </AppBar>
      <MedicalRecordsTable
        medicalRecords={medicalRecords}
        onAddClick={handleOpenAddDialog}
        onSearch={handleSearch}
        setMedicalRecords={setMedicalRecords}
      />
    </div>
  );
};

export default GetData;
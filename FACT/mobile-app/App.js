import 'react-native-gesture-handler';
import * as React from 'react';

import {Button} from 'react-native';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import LoadingScreen from './src/screens/loading';
import Home from './src/screens/home';
import EditBooking from './src/screens/booking-edit';
import MyBookings from './src/screens/bookings-my';
import BookAppointment from './src/screens/booking-add';
import BusinessHome from './src/screens/businessHome';
import RegisterBusiness from './src/screens/business-add';
import ManageStaff from './src/screens/staff-manage';
import AddStaff from './src/screens/staff-add';
import EditStaff from './src/screens/staff-edit';
import UpdateWalkinCount from './src/screens/walkinCount-add';
import DisplayWalkinCount from './src/screens/walkinCount-display';
import Chat from './src/screens/chat';
import Map from './src/screens/map';

import {HomeIcon, BookingIcon, BusinessIcon, ChatIcon} from './src/images/svg-icons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const BusinessManageStaffStackOptions = ({navigation}) => {
  return ({
    headerRight: () => (
      <Button
        onPress={() => navigation.navigate('Add Staff')}
        title='Add Staff'
      />
    )
  });
};

const tabBarOptions = {
  showLabel: true,
  activeTintColor: '#1062FE',
  inactiveTintColor: '#000',
  style: {
    backgroundColor: '#F1F0EE',
    paddingTop: 0
  }
};

const TabLayout = () => (
  <Tab.Navigator
    style={{paddingTop: 50}}
    initialRouteName='Home'
    tabBarOptions={tabBarOptions} >
    
    <Tab.Screen
      name='Home'
      component={HomeStackLayout}
      options={{
        tabBarIcon: ({color}) => (<HomeIcon fill={color}/>)
      }}
    />

<Tab.Screen
      name='Book Appointment'
      component={BookAppointmentStackLayout}
      options={{
        tabBarIcon: ({color}) => (<BookingIcon fill={color} />)
      }}
    />

<Tab.Screen
      name='Business'
      component={BusinessStackLayout}
      options={{
        tabBarIcon: ({color}) => (<BusinessIcon fill={color} />)
      }}
    />

<Tab.Screen
      name='Ask a Question'
      component={ChatStackLayout}
      options={{
        tabBarIcon: ({color}) => (<ChatIcon fill={color} />)
      }}
    />

  </Tab.Navigator>
);

const HomeStackLayout = () => (
  <Stack.Navigator>
    <Stack.Screen name='Home' component={Home} />
   <Stack.Screen name='My Bookings' component={MyBookings} />
  <Stack.Screen name='Edit Booking' component={EditBooking} />
  <Stack.Screen name='Display WalkinCount' component={DisplayWalkinCount} />
  </Stack.Navigator>
);

const BookAppointmentStackLayout = () => (
  <Stack.Navigator>
    <Stack.Screen name='New Booking' component={BookAppointment} />
    <Stack.Screen name='Map' component={Map} />
  </Stack.Navigator>
);

const BusinessStackLayout = () => (
  <Stack.Navigator>
    <Stack.Screen name='Business Home Page' component={BusinessHome} />
    <Stack.Screen name='Register Business' component={RegisterBusiness} />
    <Stack.Screen name='Manage Staff' component={ManageStaff} options={BusinessManageStaffStackOptions} />
    <Stack.Screen name='Add Staff' component={AddStaff} />
    <Stack.Screen name='Edit Staff' component={EditStaff} />
    <Stack.Screen name='Update Walk-in Count' component={UpdateWalkinCount} />
    <Stack.Screen name='Chat' component={Chat} />
  </Stack.Navigator>
);

const ChatStackLayout = () => (
  <Stack.Navigator>
    <Stack.Screen name='Chat' component={Chat} />
  </Stack.Navigator>
);

const App = () => {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (<LoadingScreen />);
  } else {
    return (
      <NavigationContainer>
        <TabLayout/>
      </NavigationContainer>
    );
  }
};

export default App;
